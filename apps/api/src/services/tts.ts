/**
 * Text-to-speech on the Mac that hosts Brain Gym.
 *
 * Why server-side: iPads only sound good if someone downloads an
 * Enhanced/Premium voice on each device. The Mac can render one good
 * voice for every device. Clips are cached on disk, so each word or
 * sentence is only generated once.
 *
 * Uses macOS `say` via execFile (no shell, so text can't inject
 * commands). On a non-Mac host this reports unavailable and the
 * browser falls back to its own speech.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../db.js";

const run = promisify(execFile);

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR ?? "./uploads");
export const TTS_DIR = path.join(UPLOADS_DIR, "tts");
fs.mkdirSync(TTS_DIR, { recursive: true });

export const VOICE_SETTING_KEY = "tts-voice";

export type Voice = { name: string; lang: string; quality: "premium" | "enhanced" | "standard" };

// Best first. Premium/Enhanced voices are free downloads in macOS
// System Settings → Accessibility → Spoken Content → System voice → Manage Voices.
const PREFERENCE = [
  /^Ava \(Premium\)/i,
  /^Zoe \(Premium\)/i,
  /^Evan \(Premium\)/i,
  /^Nathan \(Premium\)/i,
  /^Samantha \(Premium\)/i,
  /\(Premium\)/i,
  /^Ava \(Enhanced\)/i,
  /^Samantha \(Enhanced\)/i,
  /\(Enhanced\)/i,
  /^Samantha/i,
];

// Novelty voices and the robotic "Eloquence" family: no good for teaching.
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Zarvox|Fred|Junior|Ralph|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;

let voicesCache: Voice[] | null = null;

export async function listVoices(): Promise<Voice[]> {
  if (voicesCache) return voicesCache;
  if (process.platform !== "darwin") return (voicesCache = []);
  try {
    const { stdout } = await run("say", ["-v", "?"]);
    const seen = new Set<string>();
    voicesCache = stdout
      .split("\n")
      .map((line) => line.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => ({ name: m[1].trim(), lang: m[2] }))
      .filter((v) => v.lang.startsWith("en_") && !NOVELTY.test(v.name))
      .filter((v) => (seen.has(v.name) ? false : (seen.add(v.name), true)))
      .map((v) => ({
        ...v,
        quality: /\(Premium\)/i.test(v.name)
          ? ("premium" as const)
          : /\(Enhanced\)/i.test(v.name)
          ? ("enhanced" as const)
          : ("standard" as const),
      }));
  } catch {
    voicesCache = [];
  }
  return voicesCache;
}

export function clearVoiceCache() {
  voicesCache = null;
}

export async function currentVoice(): Promise<string | null> {
  const voices = await listVoices();
  if (voices.length === 0) return null;
  const chosen = await prisma.appSetting.findUnique({ where: { key: VOICE_SETTING_KEY } });
  if (chosen && voices.some((v) => v.name === chosen.value)) return chosen.value;
  const us = voices.filter((v) => v.lang === "en_US");
  for (const re of PREFERENCE) {
    const hit = us.find((v) => re.test(v.name)) ?? voices.find((v) => re.test(v.name));
    if (hit) return hit.name;
  }
  return (us[0] ?? voices[0]).name;
}

const RATES = { normal: 165, slow: 105 } as const;
export type Rate = keyof typeof RATES;

const inflight = new Map<string, Promise<string>>();

/** Returns a path to a cached .m4a clip, generating it if needed. */
export async function renderClip(text: string, rate: Rate, voiceOverride?: string): Promise<string> {
  const voice = voiceOverride ?? (await currentVoice());
  if (!voice) throw new Error("Speech is not available on this server");

  const key = crypto.createHash("sha1").update(`${voice}|${rate}|${text}`).digest("hex");
  const file = path.join(TTS_DIR, `${key}.m4a`);
  if (fs.existsSync(file)) return file;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    const tmp = `${file}.${process.pid}.tmp.m4a`;
    await run(
      "say",
      ["-v", voice, "-r", String(RATES[rate]), "--file-format=m4af", "--data-format=aac", "-o", tmp, "--", text],
      { timeout: 15000 }
    );
    fs.renameSync(tmp, file);
    return file;
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
