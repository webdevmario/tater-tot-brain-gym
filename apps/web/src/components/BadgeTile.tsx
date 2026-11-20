import type { BadgeProgress } from "../lib/api";

// Earned badges are full color; locked ones are muted with a progress
// meter so the kid can see exactly how close they are.
export default function BadgeTile({ badge, compact }: { badge: BadgeProgress; compact?: boolean }) {
  const earned = !!badge.earnedAt;
  const pct = Math.round((badge.progress / badge.target) * 100);
  return (
    <div
      className={`rounded-3xl p-4 text-center flex flex-col items-center ${
        earned ? "bg-white border-2 border-spud-200 shadow-soft" : "bg-cream-100/70 border-2 border-dashed border-teal-100"
      }`}
    >
      <span
        className={`grid place-items-center rounded-full ${compact ? "w-14 h-14 text-3xl" : "w-20 h-20 text-5xl"} ${
          earned ? "bg-spud-50" : "bg-white grayscale opacity-60"
        }`}
        aria-hidden
      >
        {badge.emoji}
      </span>
      <p className={`mt-2 font-display font-semibold leading-tight ${earned ? "text-teal-600" : "text-teal-400"}`}>
        {badge.label}
      </p>
      {!compact && <p className="text-sm text-teal-400 mt-1 leading-snug">{badge.description}</p>}
      {!earned && (
        <div className="mt-2 w-full">
          <div className="h-1.5 rounded-full bg-white overflow-hidden">
            <div className="h-full bg-spud-300 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-teal-400 mt-1">
            {badge.target === 1 ? "Not yet" : `${badge.progress} / ${badge.target}`}
          </p>
        </div>
      )}
      {earned && !compact && (
        <p className="text-xs text-spud-500 font-semibold mt-2">
          Earned {new Date(badge.earnedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}
