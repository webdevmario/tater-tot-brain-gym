/**
 * Spaced repetition engine. Simplified SM-2.
 *
 * After every attempt, we update the ReviewState for (kid, item):
 *   - easeFactor: how quickly intervals should grow
 *   - intervalDays: days until next review (fractional = same-session requeue)
 *   - repetitions: how many times in a row they've gotten it right
 *   - lapses: how many times they got it wrong after previously getting it right
 *   - nextReviewAt: when to show it again
 *
 * Mastery: once repetitions >= 5 and easeFactor >= 2.5, item is marked mastered
 * and drops out of active rotation. Admin can manually unmaster.
 */

import type { ReviewState } from "@prisma/client";

export type AttemptOutcome = {
  correct: boolean;
  timedOut: boolean;
  responseMs: number;
};

export type ReviewUpdate = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  nextReviewAt: Date;
  masteredAt: Date | null;
};

const MIN_EASE = 1.3;
const MASTERY_REPETITIONS = 5;
const MASTERY_EASE = 2.5;

export function computeReviewUpdate(
  current: ReviewState | null,
  outcome: AttemptOutcome
): ReviewUpdate {
  const now = new Date();

  const prev: ReviewUpdate = current
    ? {
        easeFactor: current.easeFactor,
        intervalDays: current.intervalDays,
        repetitions: current.repetitions,
        lapses: current.lapses,
        nextReviewAt: current.nextReviewAt,
        masteredAt: current.masteredAt,
      }
    : {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        nextReviewAt: now,
        masteredAt: null,
      };

  // Quality score: 5 = correct and fast, 4 = correct but slow, 2 = wrong, 0 = timed out
  let quality: number;
  if (outcome.timedOut) {
    quality = 0;
  } else if (!outcome.correct) {
    quality = 2;
  } else if (outcome.responseMs > 8000) {
    quality = 3;
  } else if (outcome.responseMs > 4000) {
    quality = 4;
  } else {
    quality = 5;
  }

  let { easeFactor, intervalDays, repetitions, lapses, masteredAt } = prev;

  if (quality < 3) {
    // Got it wrong or timed out: reset repetitions, requeue in-session, count a lapse
    if (prev.repetitions > 0) lapses += 1;
    repetitions = 0;
    intervalDays = 0.001; // same-session requeue (less than a day)
    // Unmaster if previously mastered
    masteredAt = null;
  } else {
    // Got it right: advance repetitions and interval
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(prev.intervalDays * easeFactor);
    }
    // Adjust ease factor based on quality (SM-2 formula)
    easeFactor = Math.max(
      MIN_EASE,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
    // Check mastery
    if (
      repetitions >= MASTERY_REPETITIONS &&
      easeFactor >= MASTERY_EASE &&
      !masteredAt
    ) {
      masteredAt = now;
    }
  }

  const nextReviewAt = new Date(now.getTime() + intervalDays * 86400000);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    nextReviewAt,
    masteredAt,
  };
}
