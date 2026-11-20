/**
 * Session engine: picks the next item for a kid in an active round.
 *
 * Strategy:
 *   1. Items due for review (nextReviewAt <= now) from enabled packs are the priority.
 *      Struggling items (flagged by admin) come first.
 *   2. If nothing is due, add brand-new items the kid has never seen,
 *      biased toward their grade level.
 *   3. If there are no new items either, fall back to whatever's closest
 *      to being due — but never an item they already got right today.
 *   4. Last, a miss from this round that hasn't been fixed yet comes back
 *      (as long as it wasn't the question just asked).
 *
 * Rules that keep a round feeling fair:
 *   - An item answered correctly in this round is never served again in
 *     the same round. Misses do come back later in the round on purpose.
 *   - No item repeats within the last few questions.
 *   - When nothing is left, return null and the round ends early instead
 *     of repeating questions the kid just answered.
 */

import { prisma } from "../db.js";

const RECENT_ITEM_COOLDOWN = 5; // don't re-show an item within the last N items

export type RoundHistory = {
  /** Item IDs answered in this round, oldest first. */
  answered: Array<{ itemId: string; correct: boolean }>;
};

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function pickNextItem(
  kidId: string,
  round: RoundHistory,
  focusPackId: string | null = null
) {
  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
    include: { enabledPacks: { where: { enabled: true, pack: { archived: false } } } },
  });
  if (!kid) throw new Error("Kid not found");

  // A focused workout drills one pack; a mixed workout uses all enabled packs.
  const enabledPackIds = kid.enabledPacks
    .map((kp) => kp.packId)
    .filter((id) => !focusPackId || id === focusPackId);
  if (enabledPackIds.length === 0) return null;

  const now = new Date();
  const ids = round.answered.map((a) => a.itemId);
  const recent = ids.slice(-RECENT_ITEM_COOLDOWN);
  const rightThisRound = new Set(round.answered.filter((a) => a.correct).map((a) => a.itemId));
  const excludeIds = [...new Set([...recent, ...rightThisRound])];
  const inPacks = { packId: { in: enabledPackIds }, gradeLevel: { lte: kid.grade } };

  // 1. Items due for review
  const due = await prisma.reviewState.findFirst({
    where: {
      kidId,
      nextReviewAt: { lte: now },
      masteredAt: null,
      itemId: { notIn: excludeIds },
      item: inPacks,
    },
    include: { item: true },
    orderBy: [{ strugglingFlag: "desc" }, { nextReviewAt: "asc" }],
  });
  if (due) return due.item;

  // 2. New items (never seen before), biased to grade level.
  const seenItemIds = await prisma.reviewState
    .findMany({ where: { kidId }, select: { itemId: true } })
    .then((rows) => rows.map((r) => r.itemId));

  const newItems = await prisma.item.findMany({
    where: { ...inPacks, id: { notIn: [...seenItemIds, ...excludeIds] } },
    orderBy: { gradeLevel: "desc" }, // prefer items at kid's current grade
    take: 20,
  });
  if (newItems.length > 0) {
    const atGrade = newItems.filter((i) => i.gradeLevel === kid.grade);
    const pool = atGrade.length > 0 ? atGrade : newItems;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 3. Nothing due and nothing new: keep drilling with whatever's closest
  //    to due (non-mastered first, then mastered for maintenance), skipping
  //    anything they've already gotten right today. Repeating a question
  //    answered correctly minutes ago feels broken to a kid.
  const rightToday = await prisma.attempt
    .findMany({
      where: { kidId, correct: true, createdAt: { gte: startOfToday(now) } },
      select: { itemId: true },
      distinct: ["itemId"],
    })
    .then((rows) => rows.map((r) => r.itemId));

  const fallback = await prisma.reviewState.findFirst({
    where: {
      kidId,
      itemId: { notIn: [...excludeIds, ...rightToday] },
      item: inPacks,
    },
    include: { item: true },
    orderBy: [
      { masteredAt: "asc" }, // null (not mastered) sorts first in SQLite ASC
      { nextReviewAt: "asc" },
    ],
  });
  if (fallback) return fallback.item;

  // 4. Small pool: a miss from this round that hasn't been fixed yet gets
  //    another go, even inside the cooldown, as long as it isn't the
  //    question they just saw.
  const last = ids[ids.length - 1];
  const unfixed = round.answered.find(
    (a) => !a.correct && !rightThisRound.has(a.itemId) && a.itemId !== last
  );
  if (unfixed) {
    const item = await prisma.item.findUnique({ where: { id: unfixed.itemId } });
    if (item) return item;
  }

  return null;
}
