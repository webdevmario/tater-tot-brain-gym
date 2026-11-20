// Spoken words and sentences.
//
// First choice: a clip rendered by the Mac's voice (/api/tts), so every
// iPad hears the same good voice without downloading anything. If the
// server can't speak, fall back to the device's own speech engine.

import { loadBuffer, playBuffer } from "./audio";

export type Pace = "normal" | "slow";

function clipUrl(text: string, pace: Pace) {
  return `/api/tts?rate=${pace}&text=${encodeURIComponent(text)}`;
}

let current: AudioBufferSourceNode | null = null;
let token = 0;

/** Warm the cache so the first tap plays instantly. */
export function prefetchSpeech(text: string, pace: Pace = "normal"): void {
  if (text) loadBuffer(clipUrl(text, pace));
}

export async function speak(text: string, pace: Pace = "normal"): Promise<void> {
  stopSpeaking();
  const mine = ++token;
  const buf = await loadBuffer(clipUrl(text, pace));
  if (mine !== token) return; // something newer was asked for meanwhile
  if (buf) {
    current = playBuffer(buf);
    return;
  }
  deviceSpeak(text, pace === "slow" ? 0.55 : 0.85);
}

export function stopSpeaking(): void {
  token++;
  try {
    current?.stop();
  } catch {
    // already ended
  }
  current = null;
  if (canDeviceSpeak) window.speechSynthesis.cancel();
}

/** Spelling-bee format: word, sentence, word. */
export function spellingLine(word: string, sentence: string | null): string {
  return sentence ? `${word}. ${sentence} ${word}.` : word;
}

// ---- Device fallback (Web Speech) ----

const canDeviceSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

const VOICE_PREFERENCE = [
  /Ava \(Premium\)/i,
  /Zoe \(Premium\)/i,
  /Samantha \(Premium\)/i,
  /\(Premium\)/i,
  /Samantha \(Enhanced\)/i,
  /\(Enhanced\)/i,
  /Samantha/i,
  /Google US English/i,
  /Microsoft (Aria|Jenny)/i,
];

function pickDeviceVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  for (const re of VOICE_PREFERENCE) {
    const v = voices.find((v) => re.test(v.name));
    if (v) return v;
  }
  return voices.find((v) => v.localService) ?? voices[0];
}

function deviceSpeak(text: string, rate: number) {
  if (!canDeviceSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.lang = "en-US";
  const v = pickDeviceVoice();
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// Speech is available if either path can work; the server path needs
// only Web Audio, which every supported browser has.
export const canSpeak = typeof window !== "undefined";
