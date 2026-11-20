import { Link, useParams } from "react-router-dom";
import type { KidProgress } from "../lib/api";
import { useCachedGet } from "../lib/cache";
import { Bone, ListSkeleton } from "../components/Loading";
import BadgeTile from "../components/BadgeTile";
import RankMedal from "../components/RankMedal";

// Every badge and every level on the ladder, so kids can see the whole
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
  // Levels 1–10, sliding along once a kid climbs past 10.
  const top = Math.max(10, data.rank.level + 1);
  const ladder = Array.from({ length: 10 }, (_, i) => {
    const level = top - 9 + i;
    return { level, minXp: data.levels.find((l) => l.level === level)?.minXp ?? xpForLevel(data.levels, level) };
  });
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

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">Levels</h2>
      {/* Two rows of five, so the whole ladder fits without sideways scrolling. */}
      <div className="panel p-4">
        <ol className="grid grid-cols-5 gap-2">
          {ladder.map((l) => {
            const reached = data.rank.level >= l.level;
            const current = data.rank.level === l.level;
            return (
              <li
                key={l.level}
                className={`flex flex-col items-center rounded-2xl py-3 px-1 ${current ? "bg-cream-100" : ""}`}
              >
                <RankMedal level={l.level} color={data.theme.accent} dim={!reached} size="md" />
                <p className={`mt-2 text-xs ${reached ? "text-teal-500" : "text-teal-300"}`}>
                  {l.minXp.toLocaleString()} XP
                </p>
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

/** XP for a level past the listed ones (each later level is another 1,500 XP). */
function xpForLevel(levels: Array<{ level: number; minXp: number }>, level: number) {
  const last = levels[levels.length - 1];
  return last.minXp + (level - last.level) * 1500;
}
