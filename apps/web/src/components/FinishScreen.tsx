import { useEffect, useState } from "react";
import type { FinishResult, Theme } from "../lib/api";
import { playSound } from "../lib/sounds";
import { confetti } from "../lib/confetti";
import LevelBadge from "./LevelBadge";
import { Spinner } from "./Loading";
import XpBar from "./XpBar";
import WeekRing from "./WeekRing";
import { themeSurface } from "../lib/theme";

type Props = {
  result: FinishResult;
  /** The round ended early because they'd done every question available. */
  cleared?: boolean;
  /** The kid's color, for the level badge and XP bar. */
  theme?: Theme;
  onAgain: () => void;
  onDone: () => void;
};

function useCountUp(target: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export default function FinishScreen({ result, cleared = false, theme, onAgain, onDone }: Props) {
  const xp = useCountUp(result.xpEarned);
  const [again, setAgain] = useState(false);
  const { rank, rankUp } = result;
  const accent = theme?.accent ?? "#1F7F7F";

  useEffect(() => {
    playSound(rankUp ? "level-up" : "session-end");
    if (rankUp || result.newBadges.length > 0 || result.breakdown.perfect > 0) {
      window.setTimeout(() => confetti(), 250);
    }
  }, [rankUp, result.newBadges.length, result.breakdown.perfect]);

  const headline = rankUp
    ? `Level ${rank.level}!`
    : result.breakdown.perfect
    ? "Perfect round!"
    : cleared
    ? "You did them all!"
    : result.completedRound
    ? "Workout done!"
    : "Nice work!";

  const lines = [
    { label: `${result.correct} right`, xp: result.breakdown.correct },
    { label: `${result.total - result.correct} good tries`, xp: result.breakdown.tried },
    { label: cleared ? "Did every question" : "Finished the round", xp: result.breakdown.finish },
    { label: "Perfect round bonus", xp: result.breakdown.perfect },
  ].filter((l) => l.xp > 0);

  return (
    <div className="safe-page min-h-[100dvh] max-w-3xl mx-auto flex flex-col items-center text-center">
      <div className="mt-6 animate-pop-in">
        <LevelBadge level={rank.level} color={accent} shade={theme?.shade} size={rankUp ? "xl" : "lg"} />
      </div>
      <h1 className="mt-5 text-5xl font-display font-bold text-teal-500 text-balance">{headline}</h1>
      {cleared && (
        <p className="mt-2 text-xl text-teal-400 text-balance">
          That's everything here for now. These come back for review in a day or two.
        </p>
      )}

      <div className="mt-6 w-full panel p-6">
        <p className="font-display font-bold text-6xl text-spud-400" aria-live="polite">
          +{xp} XP
        </p>
        <ul className="mt-3 space-y-1 text-lg text-teal-500">
          {lines.map((l) => (
            <li key={l.label} className="flex justify-between max-w-xs mx-auto">
              <span>{l.label}</span>
              <span className="font-semibold">+{l.xp}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-left">
          <XpBar
            value={rank.xpIntoRank}
            from={rankUp ? 0 : Math.max(0, rank.xpIntoRank - result.xpEarned)}
            max={rank.xpForRank}
            color={accent}
          />
          <p className="mt-2 text-teal-400 font-semibold">
            {rank.next.minXp - result.totalXp} XP to Level {rank.next.level}
          </p>
        </div>
      </div>

      {result.newBadges.length > 0 && (
        <div className="mt-5 w-full panel p-6">
          <p className="text-2xl font-display font-bold text-teal-500">
            {result.newBadges.length > 1 ? "New trophies!" : "New trophy!"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-5">
            {result.newBadges.map((b, i) => (
              <div key={b.code} className="w-36 animate-pop-in" style={{ animationDelay: `${500 + i * 200}ms` }}>
                <div className="mx-auto w-20 h-20 rounded-full bg-spud-50 border-2 border-spud-200 grid place-items-center text-5xl">
                  {b.emoji}
                </div>
                <p className="mt-2 font-display font-semibold text-teal-600">{b.label}</p>
                <p className="text-sm text-teal-400 leading-snug">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.newThemes.length > 0 && (
        <div className="mt-5 w-full panel p-6">
          <p className="text-2xl font-display font-bold text-teal-500">
            New color{result.newThemes.length > 1 ? "s" : ""} unlocked!
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {result.newThemes.map((t, i) => (
              <div
                key={t.id}
                className="w-32 h-20 rounded-2xl p-2 flex items-end text-white font-display font-semibold animate-pop-in"
                style={{ ...themeSurface(t), animationDelay: `${700 + i * 200}ms` }}
              >
                {t.name}
              </div>
            ))}
          </div>
          <p className="mt-3 text-teal-400">Try it in 🎨 Customize.</p>
        </div>
      )}

      <div className="mt-5 w-full panel p-6 flex flex-wrap items-center justify-center gap-6">
        <WeekRing week={result.week} size={80} />
        {result.streak > 0 && (
          <p className="font-display font-semibold text-2xl text-spud-500">
            🔥 {result.streak}-day streak
          </p>
        )}
      </div>

      {cleared ? (
        <div className="mt-6 mb-4 w-full grid gap-3">
          <button onClick={onDone} className="btn-primary !text-2xl !py-5">
            Pick another pack
          </button>
        </div>
      ) : (
        <div className="mt-6 mb-4 w-full grid gap-3 sm:grid-cols-2">
          <button onClick={onDone} disabled={again} className="btn-secondary !text-2xl !py-5">
            Done
          </button>
          <button
            onClick={() => {
              setAgain(true);
              onAgain();
            }}
            disabled={again}
            className="btn-primary !text-2xl !py-5 disabled:!opacity-100"
          >
            Another round
            {again && <Spinner className="text-xl" />}
          </button>
        </div>
      )}
    </div>
  );
}
