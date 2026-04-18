import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { pickNextItem } from "../services/session-engine.js";
import { computeReviewUpdate } from "../services/spaced-repetition.js";

const router = Router();

const StartSchema = z.object({
  kidId: z.string(),
  targetMinutes: z.number().int().min(5).max(60).optional(),
});

router.post("/", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const kid = await prisma.kid.findUnique({ where: { id: parsed.data.kidId } });
  if (!kid) return res.status(404).json({ error: "Kid not found" });

  const session = await prisma.session.create({
    data: {
      kidId: kid.id,
      targetMinutes: parsed.data.targetMinutes ?? kid.sessionMinutes,
    },
  });
  res.status(201).json(session);
});

router.get("/:id/next-item", async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { attempts: { orderBy: { createdAt: "desc" }, take: 10, select: { itemId: true } } },
  });
  if (!session) return res.status(404).json({ error: "Session not found" });

  const recentItemIds = session.attempts.map((a) => a.itemId);
  const item = await pickNextItem(session.kidId, recentItemIds);
  if (!item) return res.json({ done: true });

  res.json({
    done: false,
    item: {
      id: item.id,
      packId: item.packId,
      prompt: item.prompt,
      choices: item.choices ? JSON.parse(item.choices) : null,
      context: null, // don't reveal context up front, only after wrong answer
      audioText: item.audioText,
    },
  });
});

const AttemptSchema = z.object({
  itemId: z.string(),
  userAnswer: z.string().nullable(),
  timedOut: z.boolean().optional(),
  responseMs: z.number().int().min(0),
  shownTeachCard: z.boolean().optional(),
});

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isCorrect(userAnswer: string | null, answer: string): boolean {
  if (userAnswer === null) return false;
  return normalize(userAnswer) === normalize(answer);
}

router.post("/:id/attempts", async (req, res) => {
  const parsed = AttemptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const correct =
    !(parsed.data.timedOut ?? false) && isCorrect(parsed.data.userAnswer, item.answer);

  const attempt = await prisma.attempt.create({
    data: {
      kidId: session.kidId,
      itemId: parsed.data.itemId,
      sessionId: session.id,
      correct,
      timedOut: parsed.data.timedOut ?? false,
      responseMs: parsed.data.responseMs,
      userAnswer: parsed.data.userAnswer,
      shownTeachCard: parsed.data.shownTeachCard ?? false,
    },
  });

  // Update review state
  const current = await prisma.reviewState.findUnique({
    where: { kidId_itemId: { kidId: session.kidId, itemId: parsed.data.itemId } },
  });

  const update = computeReviewUpdate(current, {
    correct,
    timedOut: parsed.data.timedOut ?? false,
    responseMs: parsed.data.responseMs,
  });

  await prisma.reviewState.upsert({
    where: { kidId_itemId: { kidId: session.kidId, itemId: parsed.data.itemId } },
    update,
    create: {
      kidId: session.kidId,
      itemId: parsed.data.itemId,
      ...update,
    },
  });

  // Return the teach card info if they missed it
  const teachCard = !correct
    ? {
        answer: item.answer,
        context: item.context,
        mnemonic: item.mnemonic,
      }
    : null;

  res.json({ attempt, correct, teachCard });
});

router.patch("/:id", async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { attempts: true },
  });
  if (!session) return res.status(404).json({ error: "Session not found" });

  const correct = session.attempts.filter((a) => a.correct).length;
  const total = session.attempts.length;
  // Simple XP: 10 per correct answer, +5 bonus if session accuracy >= 80%
  const xp = correct * 10 + (total > 0 && correct / total >= 0.8 ? 5 : 0);

  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: { endedAt: new Date(), xpEarned: xp },
  });

  // Award badges
  await maybeAwardBadges(session.kidId);

  res.json({ ...updated, correct, total, xpEarned: xp });
});

async function maybeAwardBadges(kidId: string) {
  const [attemptCount, sessionCount] = await Promise.all([
    prisma.attempt.count({ where: { kidId, correct: true } }),
    prisma.session.count({ where: { kidId, endedAt: { not: null } } }),
  ]);

  const candidates: Array<{ code: string; label: string }> = [];
  if (attemptCount >= 100) candidates.push({ code: "100-correct", label: "100 Correct Answers" });
  if (attemptCount >= 500) candidates.push({ code: "500-correct", label: "500 Correct Answers" });
  if (sessionCount >= 10) candidates.push({ code: "10-sessions", label: "10 Sessions Complete" });
  if (sessionCount >= 50) candidates.push({ code: "50-sessions", label: "50 Sessions Complete" });

  for (const b of candidates) {
    await prisma.badge
      .create({ data: { kidId, code: b.code, label: b.label } })
      .catch(() => {}); // unique constraint: already earned
  }
}

export default router;
