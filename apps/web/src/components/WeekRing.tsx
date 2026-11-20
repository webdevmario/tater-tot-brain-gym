import type { Week } from "../lib/api";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

// Apple-Fitness-style ring for the weekly workout goal, plus one dot per
// weekday. The ring caps at full; extra workouts just keep it closed.
export default function WeekRing({ week, size = 96 }: { week: Week; size?: number }) {
  const stroke = size * 0.13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, week.done / Math.max(1, week.goal));
  const closed = pct >= 1;
  const today = (new Date().getDay() + 6) % 7;

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FAF1DC" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={closed ? "#3FA36B" : "#F2B04A"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center leading-none">
          <span className="font-display font-bold text-teal-600" style={{ fontSize: size * 0.28 }}>
            {closed ? "✓" : `${week.done}/${week.goal}`}
          </span>
        </div>
      </div>
      <div>
        <p className="font-display font-semibold text-lg text-teal-600 leading-tight">
          {closed ? "Weekly goal done!" : `${week.goal - week.done} more this week`}
        </p>
        <div className="mt-2 flex gap-1.5" aria-label="Workout days this week">
          {week.days.map((on, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold ${
                  on
                    ? "bg-spud-300 text-teal-600"
                    : i === today
                    ? "bg-white border-2 border-dashed border-spud-300 text-teal-300"
                    : "bg-cream-100 text-teal-200"
                }`}
              >
                {on ? "✓" : DAY_LETTERS[i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
