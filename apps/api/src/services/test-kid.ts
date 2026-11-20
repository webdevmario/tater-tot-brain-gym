/**
 * The test profile: a kid the grown-ups can play as to try new features,
 * then wipe back to a brand-new start with one tap (or `pnpm test-kid:reset`).
 * Only a profile flagged isTest can be reset this way.
 */

import { prisma } from "../db.js";

const TEST_DEFAULTS = {
  avatarEmoji: "🙂",
  avatarPath: null,
  theme: "teal",
  titleBadge: null,
  roundSize: 10,
  weeklyGoal: 3,
};

/** Find the test profile, creating it if there isn't one yet. */
export async function ensureTestKid() {
  const existing = await prisma.kid.findFirst({ where: { isTest: true }, orderBy: { createdAt: "asc" } });
  if (existing) return { kid: existing, created: false };

  // Usernames are unique; pick the first free "test" handle.
  let username = "test";
  for (let n = 2; await prisma.kid.findUnique({ where: { username } }); n++) username = `test${n}`;

  const kid = await prisma.kid.create({
    data: { firstName: "Test", lastName: "Tot", username, grade: 3, isTest: true, ...TEST_DEFAULTS },
  });
  await enableAllPacks(kid.id);
  return { kid, created: true };
}

/**
 * Wipe all progress (answers, review schedule, rounds, trophies), restore
 * the default look, and turn on every pack so new content shows up.
 * Name and grade are kept.
 */
export async function resetTestKid(kidId: string) {
  const kid = await prisma.kid.findUnique({ where: { id: kidId } });
  if (!kid) throw Object.assign(new Error("Kid not found"), { status: 404 });
  if (!kid.isTest) throw Object.assign(new Error("Only a test profile can be reset"), { status: 400 });

  await prisma.$transaction([
    prisma.attempt.deleteMany({ where: { kidId } }),
    prisma.reviewState.deleteMany({ where: { kidId } }),
    prisma.session.deleteMany({ where: { kidId } }),
    prisma.badge.deleteMany({ where: { kidId } }),
    prisma.kid.update({ where: { id: kidId }, data: TEST_DEFAULTS }),
  ]);
  await enableAllPacks(kidId);
  return prisma.kid.findUniqueOrThrow({ where: { id: kidId } });
}

async function enableAllPacks(kidId: string) {
  const packs = await prisma.pack.findMany({ where: { archived: false }, select: { id: true } });
  for (const p of packs) {
    await prisma.kidPack.upsert({
      where: { kidId_packId: { kidId, packId: p.id } },
      update: { enabled: true },
      create: { kidId, packId: p.id, enabled: true },
    });
  }
}
