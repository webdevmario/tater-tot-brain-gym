/**
 * Progression: XP, ranks, streaks, weekly goal, and badges.
 *
 * Design rules (kid-facing, so these matter more than the math):
 *   - Nothing is ever taken away. No hearts, no XP loss, no rank demotion.
 *   - Trying counts. A wrong answer still earns a little XP.
 *   - No time pressure anywhere. Speed never affects XP or badges.
 *   - Streaks are shown when alive and quietly reset otherwise; the UI
 *     never says "you lost your streak".
 *
 * Day boundaries use the server's local time. The server is the family
 * Mac, so "today" matches the house clock.
 */

import { prisma } from "../db.js";

// ---------- XP rules ----------

export const XP = {
  correct: 10,
  tried: 2, // a wrong answer still counts as a rep
  finishRound: 20, // completed the whole round
  perfectRound: 25, // completed the round with no misses
} as const;

export type XpBreakdown = {
  correct: number;
  tried: number;
  finish: number;
  perfect: number;
  total: number;
};

export function computeSessionXp(
  correct: number,
  total: number,
  completedRound: boolean
): XpBreakdown {
  const wrong = total - correct;
  const b = {
    correct: correct * XP.correct,
    tried: wrong * XP.tried,
    finish: completedRound ? XP.finishRound : 0,
    perfect: completedRound && total >= 5 && wrong === 0 ? XP.perfectRound : 0,
  };
  return { ...b, total: b.correct + b.tried + b.finish + b.perfect };
}

// ---------- Ranks ----------
// Early ranks come fast (first round gets you to Sprout) so a new kid
// sees progress immediately; later ones stretch out over weeks.

export type RankDef = { level: number; name: string; emoji: string; minXp: number; color: string };

export const RANKS: RankDef[] = [
  { level: 1, name: "Seedling", emoji: "🌱", minXp: 0, color: "#7BBF6A" },
  { level: 2, name: "Sprout", emoji: "🌿", minXp: 60, color: "#3FA36B" },
  { level: 3, name: "Tater Tot", emoji: "🥔", minXp: 200, color: "#C9963F" },
  { level: 4, name: "Hash Brown", emoji: "🧇", minXp: 400, color: "#B87A2E" },
  { level: 5, name: "Curly Fry", emoji: "🌀", minXp: 700, color: "#E89020" },
  { level: 6, name: "Super Fry", emoji: "🍟", minXp: 1100, color: "#E54936" },
  { level: 7, name: "Baked Potato", emoji: "🔥", minXp: 1600, color: "#C2410C" },
  { level: 8, name: "Loaded Potato", emoji: "⭐", minXp: 2300, color: "#7C3AED" },
  { level: 9, name: "Mega Spud", emoji: "🚀", minXp: 3200, color: "#2563EB" },
  { level: 10, name: "Golden Spud", emoji: "👑", minXp: 4400, color: "#D4A017" },
];

// After Golden Spud, every PRESTIGE_STEP XP adds a star so the ladder never ends.
const PRESTIGE_STEP = 1500;

export type RankInfo = {
  level: number;
  name: string;
  emoji: string;
  color: string;
  stars: number; // Golden Spud prestige stars
  minXp: number;
  next: { name: string; emoji: string; minXp: number } | null;
  xpIntoRank: number;
  xpForRank: number; // size of this rank's band
};

export function rankForXp(xp: number): RankInfo {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].minXp) idx = i;
  const r = RANKS[idx];
  const top = RANKS[RANKS.length - 1];

  if (idx < RANKS.length - 1) {
    const n = RANKS[idx + 1];
    return {
      ...r,
      stars: 0,
      next: { name: n.name, emoji: n.emoji, minXp: n.minXp },
      xpIntoRank: xp - r.minXp,
      xpForRank: n.minXp - r.minXp,
    };
  }

  const beyond = xp - top.minXp;
  const stars = Math.floor(beyond / PRESTIGE_STEP);
  const bandStart = top.minXp + stars * PRESTIGE_STEP;
  return {
    ...r,
    stars,
    minXp: bandStart,
    next: { name: `Golden Spud ★${stars + 1}`, emoji: "👑", minXp: bandStart + PRESTIGE_STEP },
    xpIntoRank: xp - bandStart,
    xpForRank: PRESTIGE_STEP,
  };
}

// ---------- Dates ----------

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfWeek(now: Date): Date {
  // Week starts Monday.
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d;
}

/**
 * Consecutive days with at least one finished workout, counting back
 * from today. If today has none yet, the streak still counts through
 * yesterday so a kid opening the app in the morning sees "3 days"
 * rather than 0.
 */
function computeStreak(days: Set<string>, now: Date): { current: number; practicedToday: boolean } {
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const practicedToday = days.has(dayKey(cursor));
  if (!practicedToday) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, practicedToday };
}

function longestStreak(days: Set<string>): number {
  const sorted = [...days]
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m - 1, d).getTime();
    })
    .sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const t of sorted) {
    // 36h tolerance absorbs DST shifts
    run = t - prev <= 36 * 3600 * 1000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

// ---------- Badges ----------

export type BadgeStats = {
  workouts: number;
  correct: number;
  learned: number;
  mastered: number;
  longestStreak: number;
  perfectRounds: number;
  bounceBacks: number;
  weeklyGoalMet: boolean;
};

type BadgeDef = {
  code: string;
  label: string;
  emoji: string;
  description: string;
  metric: keyof BadgeStats;
  target: number;
};

function ladder(
  metric: keyof BadgeStats,
  emoji: string,
  steps: Array<[number, string, string]>
): BadgeDef[] {
  return steps.map(([target, label, description]) => ({
    code: `${metric}-${target}`,
    label,
    emoji,
    description,
    metric,
    target,
  }));
}

export const BADGES: BadgeDef[] = [
  ...ladder("workouts", "🏋️", [
    [1, "First Rep", "Finish your first workout"],
    [5, "Warmed Up", "Finish 5 workouts"],
    [15, "Gym Regular", "Finish 15 workouts"],
    [40, "Iron Brain", "Finish 40 workouts"],
    [100, "Legend", "Finish 100 workouts"],
  ]),
  ...ladder("correct", "✅", [
    [50, "Fifty Facts", "Get 50 answers right"],
    [200, "Fact Finder", "Get 200 answers right"],
    [500, "Brain Builder", "Get 500 answers right"],
    [1000, "Thousand Club", "Get 1,000 answers right"],
  ]),
  ...ladder("learned", "🧠", [
    [10, "Quick Learner", "Learn 10 different facts"],
    [50, "Sponge", "Learn 50 different facts"],
    [150, "Know-It-All", "Learn 150 different facts"],
  ]),
  ...ladder("mastered", "🏆", [
    [5, "Locked In", "Master 5 facts for good"],
    [25, "Memory Master", "Master 25 facts for good"],
    [100, "Vault", "Master 100 facts for good"],
  ]),
  ...ladder("longestStreak", "🔥", [
    [3, "On a Roll", "Practice 3 days in a row"],
    [7, "Week Warrior", "Practice 7 days in a row"],
    [14, "Unstoppable", "Practice 14 days in a row"],
  ]),
  ...ladder("perfectRounds", "💎", [
    [1, "Flawless", "Finish a round with no misses"],
    [10, "Sharpshooter", "Finish 10 perfect rounds"],
  ]),
  ...ladder("bounceBacks", "💪", [
    [1, "Bounce Back", "Get one right that you missed before"],
    [25, "Comeback Kid", "Bounce back on 25 facts"],
  ]),
  {
    code: "weekly-goal",
    label: "Goal Getter",
    emoji: "🎯",
    description: "Hit your weekly workout goal",
    metric: "weeklyGoalMet",
    target: 1,
  },
];

function metricValue(stats: BadgeStats, metric: keyof BadgeStats): number {
  const v = stats[metric];
  return typeof v === "boolean" ? (v ? 1 : 0) : v;
}

// ---------- Kid progress (one call powers the kid dashboard) ----------

export type KidProgress = Awaited<ReturnType<typeof getKidProgress>>;

export async function getKidProgress(kidId: string) {
  const kid = await prisma.kid.findUnique({ where: { id: kidId } });
  if (!kid) return null;
  const now = new Date();

  const [sessions, correct, reviewStates, earnedBadges, bounceBacks] = await Promise.all([
    prisma.session.findMany({
      where: { kidId, endedAt: { not: null } },
      select: {
        endedAt: true,
        xpEarned: true,
        targetCount: true,
        _count: { select: { attempts: true } },
        attempts: { select: { correct: true } },
      },
    }),
    prisma.attempt.count({ where: { kidId, correct: true } }),
    prisma.reviewState.findMany({
      where: { kidId },
      select: { repetitions: true, masteredAt: true, item: { select: { packId: true } } },
    }),
    prisma.badge.findMany({ where: { kidId } }),
    countBounceBacks(kidId),
  ]);

  // A round counts as a workout (streak, weekly goal, badges) once it's
  // finished or has at least 5 answers. XP from shorter rounds still counts.
  const workouts = sessions.filter(
    (s) => s._count.attempts >= Math.min(5, s.targetCount)
  );
  const totalXp = sessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const days = new Set(workouts.map((s) => dayKey(s.endedAt!)));
  const streak = computeStreak(days, now);
  const weekStart = startOfWeek(now);
  const thisWeek = workouts.filter((s) => s.endedAt! >= weekStart).length;
  // Which weekdays (Mon..Sun) had a workout — drives the week dots.
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return days.has(dayKey(d));
  });

  const perfectRounds = workouts.filter(
    (s) =>
      s.attempts.length >= s.targetCount &&
      s.attempts.length >= 5 &&
      s.attempts.every((a) => a.correct)
  ).length;

  // "Learned" = answered right at least once since the last miss.
  const learned = reviewStates.filter((r) => r.repetitions > 0 || r.masteredAt).length;
  const mastered = reviewStates.filter((r) => r.masteredAt).length;

  const stats: BadgeStats = {
    workouts: workouts.length,
    correct,
    learned,
    mastered,
    longestStreak: longestStreak(days),
    perfectRounds,
    bounceBacks,
    weeklyGoalMet: thisWeek >= kid.weeklyGoal,
  };

  const earnedMap = new Map(earnedBadges.map((b) => [b.code, b.earnedAt]));
  const badges = BADGES.map((b) => {
    const value = metricValue(stats, b.metric);
    return {
      code: b.code,
      label: b.label,
      emoji: b.emoji,
      description: b.description,
      earnedAt: earnedMap.get(b.code) ?? null,
      progress: Math.min(value, b.target),
      target: b.target,
    };
  });

  return {
    totalXp,
    rank: rankForXp(totalXp),
    streak: streak.current,
    practicedToday: streak.practicedToday,
    week: { done: thisWeek, goal: kid.weeklyGoal, days: weekDays },
    stats,
    badges,
    reviewStates,
  };
}

/** Items the kid got right after having missed them at some point earlier. */
async function countBounceBacks(kidId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT COUNT(DISTINCT a.itemId) AS n
    FROM Attempt a
    WHERE a.kidId = ${kidId} AND a.correct = 1
      AND EXISTS (
        SELECT 1 FROM Attempt b
        WHERE b.kidId = a.kidId AND b.itemId = a.itemId
          AND b.correct = 0 AND b.createdAt < a.createdAt
      )`;
  return Number(rows[0]?.n ?? 0);
}

/** Persist any newly earned badges. Returns the ones awarded just now. */
export async function awardBadges(kidId: string) {
  const progress = await getKidProgress(kidId);
  if (!progress) return [];
  const fresh = progress.badges.filter((b) => !b.earnedAt && b.progress >= b.target);
  for (const b of fresh) {
    await prisma.badge
      .create({ data: { kidId, code: b.code, label: b.label } })
      .catch(() => {}); // unique constraint: already earned
  }
  return fresh.map(({ code, label, emoji, description }) => ({ code, label, emoji, description }));
}
