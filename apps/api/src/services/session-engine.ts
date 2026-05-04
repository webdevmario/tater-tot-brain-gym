/**
 * Session engine: picks the next item for a kid in an active session.
 *
 * Strategy:
 *   1. Items due for review (nextReviewAt <= now) from enabled packs are the priority.
 *   2. Struggling items (flagged by admin) are weighted higher.
 *   3. If fewer than N due items, fill with brand-new items the kid has never seen,
 *      biased toward their grade level.
 *   4. Mastered items are only included if nothing else is due.
 *
 * We also avoid showing the same item twice within a few items (short-term
 * repetition hurts spacing effect).
 */

import { prisma } from "../db.js";

const RECENT_ITEM_COOLDOWN = 5; // don't re-show an item within the last N items

export async function pickNextItem(kidId: string, recentItemIds: string[]) {
  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
    include: { enabledPacks: { where: { enabled: true }, include: { pack: true } } },
  });
  if (!kid) throw new Error("Kid not found");

  const enabledPackIds = kid.enabledPacks.map((kp) => kp.packId);
  if (enabledPackIds.length === 0) return null;

  const now = new Date();
  const excludeIds = recentItemIds.slice(-RECENT_ITEM_COOLDOWN);

  // 1. Items due for review
  const dueReviews = await prisma.reviewState.findMany({
    where: {
      kidId,
      nextReviewAt: { lte: now },
      masteredAt: null,
      itemId: { notIn: excludeIds },
      item: { packId: { in: enabledPackIds } },
    },
    include: { item: { include: { pack: true } } },
    orderBy: [
      { strugglingFlag: "desc" },
      { nextReviewAt: "asc" },
    ],
    take: 10,
  });

  if (dueReviews.length > 0) {
    // Weighted pick: struggling items first, then longest overdue
    const chosen = dueReviews[0];
    return chosen.item;
  }

  // 2. No due items? Add new items (never seen before), biased to grade level.
  const seenItemIds = await prisma.reviewState
    .findMany({ where: { kidId }, select: { itemId: true } })
    .then((rows) => rows.map((r) => r.itemId));

  const newItems = await prisma.item.findMany({
    where: {
      packId: { in: enabledPackIds },
      id: { notIn: [...seenItemIds, ...excludeIds] },
      gradeLevel: { lte: kid.grade },
    },
    orderBy: { gradeLevel: "desc" }, // prefer items at kid's current grade
    take: 20,
  });

  if (newItems.length > 0) {
    // Weighted toward kid's exact grade: filter to items at kid.grade first
    const atGrade = newItems.filter((i) => i.gradeLevel === kid.grade);
    const pool = atGrade.length > 0 ? atGrade : newItems;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 3. Nothing strictly due and no new items. Fall back to whatever's
  //    closest to being due in the enabled packs — non-mastered items
  //    first, then mastered for maintenance review. Without this, a
  //    kid who finishes all of their items in a session and then
  //    starts a new one immediately gets "Workout complete" because
  //    every item is technically scheduled in the future. Keep them
  //    drilling instead.
  const fallback = await prisma.reviewState.findFirst({
    where: {
      kidId,
      itemId: { notIn: excludeIds },
      item: { packId: { in: enabledPackIds } },
    },
    include: { item: true },
    orderBy: [
      { masteredAt: "asc" }, // null (not mastered) sorts first in SQLite ASC
      { nextReviewAt: "asc" },
    ],
  });

  return fallback?.item ?? null;
}
