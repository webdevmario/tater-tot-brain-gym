import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type KidProgress } from "../lib/api";
import BadgeTile from "../components/BadgeTile";
import RankMedal from "../components/RankMedal";

// Every badge and every rank on the ladder, so kids can see the whole
// road ahead and where they are on it.
export default function Trophies() {
  const { kidId } = useParams();
  const [data, setData] = useState<KidProgress | null>(null);

  useEffect(() => {
    if (kidId) api.get<KidProgress>(`/api/kids/${kidId}/progress`).then(setData);
  }, [kidId]);

  if (!data) return <div className="min-h-[100dvh] grid place-items-center text-teal-300">Loading…</div>;

  const earned = data.badges.filter((b) => b.earnedAt);
  const locked = data.badges
    .filter((b) => !b.earnedAt)
    .sort((a, b) => b.progress / b.target - a.progress / a.target);

  return (
    <div className="safe-page min-h-[100dvh] max-w-5xl mx-auto">
      <Link to={`/kid/${kidId}`} className="btn-secondary !py-2 !px-4 !text-base">
        ← Back
      </Link>

      <h1 className="text-4xl font-display font-bold text-teal-500 mt-6">{data.kid.firstName}'s trophies</h1>
      <p className="text-teal-400 text-lg mt-1">
        {earned.length} of {data.badges.length} earned
      </p>

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">Rank ladder</h2>
      <div className="panel p-4 overflow-x-auto">
        <ol className="flex gap-2 min-w-max">
          {data.ranks.map((r) => {
            const reached = data.rank.level >= r.level;
            const current = data.rank.level === r.level;
            return (
              <li
                key={r.level}
                className={`flex flex-col items-center w-24 rounded-2xl py-3 ${current ? "bg-spud-50 ring-2 ring-spud-300" : ""}`}
              >
                <div className={reached ? "" : "grayscale opacity-40"}>
                  <RankMedal rank={{ ...r, stars: current ? data.rank.stars : 0 }} size="md" />
                </div>
                <p className={`mt-2 text-sm font-display font-semibold text-center leading-tight ${reached ? "text-teal-600" : "text-teal-300"}`}>
                  {r.name}
                </p>
                <p className="text-xs text-teal-300">{r.minXp.toLocaleString()} XP</p>
              </li>
            );
          })}
        </ol>
      </div>

      {earned.length > 0 && (
        <>
          <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">Earned</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {earned.map((b) => (
              <BadgeTile key={b.code} badge={b} />
            ))}
          </div>
        </>
      )}

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">Still to earn</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
        {locked.map((b) => (
          <BadgeTile key={b.code} badge={b} />
        ))}
      </div>
    </div>
  );
}
