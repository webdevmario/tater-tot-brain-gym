/**
 * Progression: XP, levels, streaks, weekly goal, and badges.
 *
 * Design rules (kid-facing, so these matter more than the math):
 *   - Nothing is ever taken away. No hearts, no XP loss, no level going down.
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

// ---------- Levels ----------
// Plain numbered levels. Early ones come fast (the first round gets you
// to Level 2) so a new kid sees progress right away; later ones stretch
// out over weeks. After Level 10 every LATE_STEP XP is another level, so
// the climb never ends.

export type LevelDef = { level: number; minXp: number };

export const LEVELS: LevelDef[] = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 60 },
  { level: 3, minXp: 200 },
  { level: 4, minXp: 400 },
  { level: 5, minXp: 700 },
  { level: 6, minXp: 1100 },
  { level: 7, minXp: 1600 },
  { level: 8, minXp: 2300 },
  { level: 9, minXp: 3200 },
  { level: 10, minXp: 4400 },
];

const LATE_STEP = 1500;

export type RankInfo = {
  level: number;
  minXp: number;
  next: { level: number; minXp: number };
  xpIntoRank: number;
  xpForRank: number; // size of this level's band
};

/** XP needed to reach a level (any level, including past 10). */
function minXpFor(level: number): number {
  if (level <= LEVELS.length) return LEVELS[level - 1].minXp;
  return LEVELS[LEVELS.length - 1].minXp + (level - LEVELS.length) * LATE_STEP;
}

export function rankForXp(xp: number): RankInfo {
  let level = 1;
  while (xp >= minXpFor(level + 1)) level++;
  const minXp = minXpFor(level);
  const nextMin = minXpFor(level + 1);
  return {
    level,
    minXp,
    next: { level: level + 1, minXp: nextMin },
    xpIntoRank: xp - minXp,
    xpForRank: nextMin - minXp,
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
