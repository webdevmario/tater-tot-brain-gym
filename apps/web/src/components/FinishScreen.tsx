import { useEffect, useState } from "react";
import type { FinishResult } from "../lib/api";
import { playSound } from "../lib/sounds";
import { confetti } from "../lib/confetti";
import RankMedal from "./RankMedal";
import XpBar from "./XpBar";
import WeekRing from "./WeekRing";

type Props = {
  result: FinishResult;
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

export default function FinishScreen({ result, onAgain, onDone }: Props) {
  const xp = useCountUp(result.xpEarned);
  const [again, setAgain] = useState(false);
  const { rank, rankBefore, rankUp } = result;

  useEffect(() => {
    playSound("session-end");
    if (rankUp || result.newBadges.length > 0 || result.breakdown.perfect > 0) {
      window.setTimeout(() => confetti(), 250);
    }
  }, [rankUp, result.newBadges.length, result.breakdown.perfect]);

  const headline = rankUp
    ? `You're a ${rank.name} now!`
    : result.breakdown.perfect
    ? "Perfect round!"
    : result.completedRound
    ? "Workout done!"
    : "Nice work!";

  const lines = [
    { label: `${result.correct} right`, xp: result.breakdown.correct },
    { label: `${result.total - result.correct} good tries`, xp: result.breakdown.tried },
    { label: "Finished the round", xp: result.breakdown.finish },
    { label: "Perfect round bonus", xp: result.breakdown.perfect },
  ].filter((l) => l.xp > 0);

  return (
    <div className="safe-page min-h-[100dvh] max-w-3xl mx-auto flex flex-col items-center text-center">
      <div className="mt-6 animate-pop-in">
        <RankMedal rank={rank} size="xl" />
      </div>
      <h1 className="mt-5 text-5xl font-display font-bold text-teal-500 text-balance">{headline}</h1>
      {rankUp && (
        <p className="mt-2 text-xl text-teal-400">
          You moved up from {rankBefore.emoji} {rankBefore.name}
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

        {rank.next && (
          <div className="mt-6 text-left">
            <XpBar
              value={rank.xpIntoRank}
              from={rankUp ? 0 : Math.max(0, rank.xpIntoRank - result.xpEarned)}
              max={rank.xpForRank}
              color={rank.color}
            />
            <p className="mt-2 text-teal-400 font-semibold">
              {rank.next.minXp - result.totalXp} XP to {rank.next.emoji} {rank.next.name}
            </p>
          </div>
        )}
      </div>

      {result.newBadges.length > 0 && (
        <div className="mt-5 w-full panel p-6">
          <p className="text-2xl font-display font-bold text-teal-500">
            New trophy{result.newBadges.length > 1 ? "s" : ""}!
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

      <div className="mt-5 w-full panel p-6 flex flex-wrap items-center justify-center gap-6">
        <WeekRing week={result.week} size={80} />
        {result.streak > 0 && (
          <p className="font-display font-semibold text-2xl text-spud-500">
            🔥 {result.streak}-day streak
          </p>
        )}
      </div>

      <div className="mt-6 mb-4 w-full grid gap-3 sm:grid-cols-2">
        <button onClick={onDone} className="btn-secondary !text-2xl !py-5">
          Done
        </button>
        <button
          onClick={() => {
            setAgain(true);
            onAgain();
          }}
          disabled={again}
          className="btn-primary !text-2xl !py-5"
        >
          {again ? "Getting ready…" : "Another round"}
        </button>
      </div>
    </div>
  );
}
