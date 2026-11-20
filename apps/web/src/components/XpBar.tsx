import { useEffect, useState } from "react";

type Props = {
  value: number; // XP into the current rank
  max: number; // XP size of the rank band
  color: string;
  from?: number; // optional starting value to animate from
  className?: string;
};

// Progress toward the next rank. When `from` is given it animates from
// that value to `value` on mount (used on the workout-finished screen).

export default function XpBar({ value, max, color, from, className = "" }: Props) {
  const [shown, setShown] = useState(from ?? value);
  useEffect(() => {
    if (from === undefined) {
      setShown(value);
      return;
    }
    const id = window.setTimeout(() => setShown(value), 350);
    return () => window.clearTimeout(id);
  }, [value, from]);

  const pct = Math.max(0, Math.min(100, (shown / Math.max(1, max)) * 100));
  return (
    <div
      className={`h-4 rounded-full bg-cream-100 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.12), inset 0 3px 0 rgba(255,255,255,0.35)",
        }}
      />
    </div>
  );
}
