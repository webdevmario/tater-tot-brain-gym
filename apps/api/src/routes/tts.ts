import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  VOICE_SETTING_KEY,
  clearVoiceCache,
  currentVoice,
  listVoices,
  renderClip,
} from "../services/tts.js";

const router = Router();

const ClipQuery = z.object({
  text: z.string().trim().min(1).max(400),
  rate: z.enum(["normal", "slow"]).default("normal"),
  voice: z.string().max(80).optional(), // admin preview only
});

// GET /api/tts?text=...&rate=slow → audio/mp4 clip (cached on disk)
router.get("/", async (req, res) => {
  const parsed = ClipQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Bad text" });
  const { text, rate, voice } = parsed.data;

  if (voice && !(await listVoices()).some((v) => v.name === voice)) {
    return res.status(400).json({ error: "Unknown voice" });
  }
  try {
    const file = await renderClip(text, rate, voice);
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.type("audio/mp4").sendFile(file);
  } catch {
    // Browser falls back to on-device speech.
    res.status(503).json({ error: "Speech unavailable" });
  }
});

router.get("/voices", async (_req, res) => {
  clearVoiceCache(); // pick up voices downloaded since the server started
  res.json({ voices: await listVoices(), current: await currentVoice() });
});

router.put("/voice", async (req, res) => {
  const parsed = z.object({ voice: z.string().max(80).nullable() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Bad voice" });
  const { voice } = parsed.data;
  if (voice === null) {
    await prisma.appSetting.deleteMany({ where: { key: VOICE_SETTING_KEY } });
  } else {
    if (!(await listVoices()).some((v) => v.name === voice)) {
      return res.status(400).json({ error: "Unknown voice" });
    }
    await prisma.appSetting.upsert({
      where: { key: VOICE_SETTING_KEY },
      update: { value: voice },
      create: { key: VOICE_SETTING_KEY, value: voice },
    });
  }
  res.json({ current: await currentVoice() });
});

export default router;
