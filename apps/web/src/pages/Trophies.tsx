import { Link, useParams } from "react-router-dom";
import type { KidProgress } from "../lib/api";
import { useCachedGet } from "../lib/cache";
import { Bone, ListSkeleton } from "../components/Loading";
import BadgeTile from "../components/BadgeTile";
import RankMedal from "../components/RankMedal";

// Every badge and every rank on the ladder, so kids can see the whole
// road ahead and where they are on it.
export default function Trophies() {
  const { kidId } = useParams();
  const { data } = useCachedGet<KidProgress>(kidId ? `/api/kids/${kidId}/progress` : null);

  if (!data) {
    return (
      <div className="safe-page min-h-[100dvh] max-w-5xl mx-auto" aria-busy="true">
        <Link to={`/kid/${kidId}`} className="btn-secondary !py-2 !px-4 !text-base">
          ← Back
        </Link>
        <Bone className="h-10 w-72 mt-6" />
        <Bone className="h-6 w-32 mt-2" />
        <Bone className="h-8 w-40 mt-8 mb-3" />
        <ListSkeleton rows={1} rowHeight={150} />
      </div>
    );
  }

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
      {/* Two rows of five, so the whole ladder fits without sideways scrolling. */}
      <div className="panel p-4">
        <ol className="grid grid-cols-5 gap-2">
          {data.ranks.map((r) => {
            const reached = data.rank.level >= r.level;
            const current = data.rank.level === r.level;
            return (
              <li
                key={r.level}
                className={`flex flex-col items-center rounded-2xl py-3 px-1 ${current ? "bg-spud-50 ring-2 ring-inset ring-spud-300" : ""}`}
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
