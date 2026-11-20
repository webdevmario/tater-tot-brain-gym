import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { pickNextItem } from "../services/session-engine.js";
import { computeReviewUpdate } from "../services/spaced-repetition.js";
import {
  XP,
  awardBadges,
  computeSessionXp,
  getKidProgress,
  rankForXp,
} from "../services/progression.js";
import { themeById, themesUnlockedBetween } from "../services/themes.js";

const router = Router();

// A workout is a fixed-length round of questions (Duolingo-style), not a
// timed block. Kids always know how far along they are and when it ends.

const StartSchema = z.object({
  kidId: z.string(),
  packId: z.string().nullable().optional(),
});

/**
 * Close a session and bank its XP. Idempotent: an already-closed session
 * keeps its original XP.
 */
async function finalizeSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { attempts: { select: { correct: true } } },
  });
  if (!session) return null;
  const total = session.attempts.length;
  const correct = session.attempts.filter((a) => a.correct).length;
  const completedRound = total >= session.targetCount;
  const breakdown = computeSessionXp(correct, total, completedRound);

  if (session.endedAt) {
    return { session, correct, total, completedRound, breakdown, alreadyEnded: true };
  }
  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), xpEarned: breakdown.total },
  });
  return { session: updated, correct, total, completedRound, breakdown, alreadyEnded: false };
}

router.post("/", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const kid = await prisma.kid.findUnique({ where: { id: parsed.data.kidId } });
  if (!kid) return res.status(404).json({ error: "Kid not found" });

  // If an earlier round was abandoned (iPad went to sleep, app closed),
  // bank the XP from what they did answer so effort is never lost.
  const open = await prisma.session.findMany({
    where: { kidId: kid.id, endedAt: null },
    select: { id: true, _count: { select: { attempts: true } } },
  });
  for (const s of open) {
    if (s._count.attempts > 0) await finalizeSession(s.id);
    else await prisma.session.delete({ where: { id: s.id } });
  }

  const session = await prisma.session.create({
    data: {
      kidId: kid.id,
      targetMinutes: kid.sessionMinutes,
      targetCount: kid.roundSize,
      packId: parsed.data.packId ?? null,
    },
  });
  res.status(201).json(session);
});

async function sessionProgress(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        select: { itemId: true, correct: true },
      },
      kid: { select: { id: true, firstName: true, theme: true } },
    },
  });
  if (!session) return null;
  const answered = session.attempts.length;
  const correct = session.attempts.filter((a) => a.correct).length;
  return { session, answered, correct };
}

router.get("/:id", async (req, res) => {
  const p = await sessionProgress(req.params.id);
  if (!p) return res.status(404).json({ error: "Session not found" });
  const pack = p.session.packId
    ? await prisma.pack.findUnique({ where: { id: p.session.packId }, select: { title: true } })
    : null;
  res.json({
    id: p.session.id,
    kidId: p.session.kidId,
    kidName: p.session.kid.firstName,
    packId: p.session.packId,
    packTitle: pack?.title ?? null,
    target: p.session.targetCount,
    answered: p.answered,
    correct: p.correct,
    ended: !!p.session.endedAt,
    theme: themeById(p.session.kid.theme),
  });
});

router.get("/:id/next-item", async (req, res) => {
  const p = await sessionProgress(req.params.id);
  if (!p) return res.status(404).json({ error: "Session not found" });
  const { session, answered } = p;

  if (session.endedAt || answered >= session.targetCount) {
    return res.json({ done: true, answered, target: session.targetCount });
  }

  // Attempts come newest-first; the engine wants the round in order.
  const history = [...session.attempts].reverse().map((a) => ({ itemId: a.itemId, correct: a.correct }));
  const item = await pickNextItem(session.kidId, { answered: history }, session.packId);
  if (!item) {
    if (answered === 0) {
      // Nothing to serve at the start of a round: either the pack has
      // nothing at this kid's grade ("empty"), or they've already done
      // everything available today ("cleared").
      const seen = await prisma.reviewState.count({
        where: {
          kidId: session.kidId,
          ...(session.packId ? { item: { packId: session.packId } } : {}),
        },
      });
      return res.json({ done: true, answered, target: session.targetCount, reason: seen > 0 ? "cleared" : "empty" });
    }
    // Ran out of fresh questions mid-round. End the round here and count
    // it as finished (it is: they did everything there was), rather than
    // padding it out with repeats.
    await prisma.session.update({ where: { id: session.id }, data: { targetCount: answered } });
    return res.json({ done: true, answered, target: answered, reason: "cleared" });
  }

  const pack = await prisma.pack.findUnique({
    where: { id: item.packId },
    select: { questionType: true, title: true, subject: true },
  });

  res.json({
    done: false,
    answered,
    target: session.targetCount,
    item: {
      id: item.id,
      packId: item.packId,
      packTitle: pack?.title ?? "",
      subject: pack?.subject ?? "custom",
      questionType: pack?.questionType ?? "type-answer",
      prompt: item.prompt,
      choices: item.choices ? JSON.parse(item.choices) : null,
      audioText: item.audioText,
      // Sent up front so the iPad can show right/wrong the instant a
      // choice is tapped; the server still grades and records the answer.
      answer: item.answer,
      context: item.context,
      mnemonic: item.mnemonic,
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
  return s
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:'"]+$/g, "") // trailing punctuation
    .replace(/\s+/g, " ");
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
  if (session.endedAt) return res.status(409).json({ error: "Workout already finished" });

  const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return res.status(404).json({ error: "Item not found" });

  const timedOut = parsed.data.timedOut ?? false;
  const correct = !timedOut && isCorrect(parsed.data.userAnswer, item.answer);

  const attempt = await prisma.attempt.create({
    data: {
      kidId: session.kidId,
      itemId: parsed.data.itemId,
      sessionId: session.id,
      correct,
      timedOut,
      responseMs: parsed.data.responseMs,
      userAnswer: parsed.data.userAnswer,
      shownTeachCard: !correct,
    },
  });

  const current = await prisma.reviewState.findUnique({
    where: { kidId_itemId: { kidId: session.kidId, itemId: parsed.data.itemId } },
  });
  const update = computeReviewUpdate(current, {
    correct,
    timedOut,
    responseMs: parsed.data.responseMs,
  });
  await prisma.reviewState.upsert({
    where: { kidId_itemId: { kidId: session.kidId, itemId: parsed.data.itemId } },
    update,
    create: { kidId: session.kidId, itemId: parsed.data.itemId, ...update },
  });

  // A "bounce back": they got right something they'd missed before.
  const bounceBack =
    correct &&
    (await prisma.attempt.count({
      where: {
        kidId: session.kidId,
        itemId: item.id,
        correct: false,
        createdAt: { lt: attempt.createdAt },
      },
    })) > 0;

  res.json({
    correct,
    bounceBack,
    answer: item.answer,
    xp: correct ? XP.correct : XP.tried,
    teachCard: correct
      ? null
      : { answer: item.answer, context: item.context, mnemonic: item.mnemonic },
  });
});

// Finish a workout (full round or early). Returns everything the
// celebration screen needs: XP breakdown, rank before/after, new badges.
router.patch("/:id", async (req, res) => {
  const result = await finalizeSession(req.params.id);
  if (!result) return res.status(404).json({ error: "Session not found" });
  const { session, correct, total, completedRound, breakdown } = result;

  const newBadges = result.alreadyEnded ? [] : await awardBadges(session.kidId);
  const progress = await getKidProgress(session.kidId);
  if (!progress) return res.status(404).json({ error: "Kid not found" });

  const xpEarned = session.xpEarned;
  const before = rankForXp(progress.totalXp - xpEarned);

  res.json({
    correct,
    total,
    completedRound,
    xpEarned,
    breakdown,
    totalXp: progress.totalXp,
    rankBefore: before,
    rank: progress.rank,
    rankUp: progress.rank.level > before.level,
    streak: progress.streak,
    week: progress.week,
    newBadges,
    newThemes: themesUnlockedBetween(before.level, progress.rank.level),
  });
});

export default router;
