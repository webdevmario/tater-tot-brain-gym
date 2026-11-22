// Grown-ups only: how quickly and accurately a kid answers, per pack,
// week by week. Kids never see any of this.

import { useState } from "react";

export type SpeedWeek = { week: string; answered: number; accuracy: number | null; medianMs: number | null };
export type SpeedData = {
  weeks: string[];
  idleExcluded: number;
  packs: Array<{ packId: string; title: string; weeks: SpeedWeek[] }>;
};

const W = 168;
const H = 44;
const PAD = 6;

function fmtSecs(ms: number) {
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function fmtWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One small single-series line: one point per week, gaps where there was no practice. */
function Spark({
  values,
  weeks,
  max,
  format,
  label,
}: {
  values: Array<number | null>;
  weeks: string[];
  max: number;
  format: (v: number) => string;
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const step = (W - PAD * 2) / Math.max(1, values.length - 1);
  const x = (i: number) => PAD + i * step;
  const y = (v: number) => H - PAD - (v / (max || 1)) * (H - PAD * 2);

  // Split into runs so weeks without practice leave a gap instead of a fake line.
  const runs: Array<Array<[number, number]>> = [];
  let run: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([x(i), y(v)]);
  });
  if (run.length) runs.push(run);

  return (
    <div className="relative" style={{ width: W }}>
      <svg width={W} height={H} role="img" aria-label={label} className="block overflow-visible">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="#E8F4F4" strokeWidth={1} />
        {runs.map((r, i) =>
          r.length > 1 ? (
            <polyline
              key={i}
              points={r.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#1F7F7F"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null
        )}
        {values.map((v, i) =>
          v === null ? null : (
            <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 4.5 : 3} fill="#1F7F7F" stroke="#fff" strokeWidth={2} />
          )
        )}
        {/* Hit targets wider than the marks: one column per week. */}
        {values.map((_, i) => (
          <rect
            key={`hit${i}`}
            x={x(i) - step / 2}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-lg bg-teal-600 px-2 py-1 text-xs text-white shadow-soft"
          style={{ left: Math.min(Math.max(x(hover) - 50, 0), W - 100) }}
        >
          Week of {fmtWeek(weeks[hover])}: {values[hover] === null ? "no practice" : format(values[hover]!)}
        </div>
      )}
    </div>
  );
}

function change(values: Array<number | null>) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length < 2) return null;
  return { first: present[0], last: present[present.length - 1] };
}

export default function SpeedTrend({ data }: { data: SpeedData }) {
  const packs = data.packs.filter((p) => p.weeks.some((w) => w.answered > 0));

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-display font-bold text-teal-500">Speed and Accuracy, Last 8 Weeks</h2>
      <p className="text-sm text-teal-400 mt-1 mb-4">
        Typical time to answer correctly (median), and share answered right, per week. The clock pauses when the app
        is in the background, and answers over a minute count as "walked away" and are left out
        {data.idleExcluded > 0 && ` (${data.idleExcluded} so far)`}. Kids never see this, and speed doesn't affect XP or
        review scheduling.
      </p>

      {packs.length === 0 ? (
        <p className="text-teal-400 text-sm italic">No practice in the last 8 weeks.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-teal-400">
                <th className="py-2 pr-4 font-semibold">Pack</th>
                <th className="py-2 pr-4 font-semibold">Time to answer</th>
                <th className="py-2 font-semibold">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const ms = p.weeks.map((w) => w.medianMs);
                // Each pack on its own scale so its trend is readable; the numbers carry the units.
                const maxMs = Math.max(1, ...ms.map((v) => v ?? 0)) * 1.1;
                const acc = p.weeks.map((w) => (w.accuracy === null ? null : Math.round(w.accuracy * 100)));
                const dMs = change(ms);
                const dAcc = change(acc);
                const latestMs = [...ms].reverse().find((v) => v !== null);
                const latestAcc = [...acc].reverse().find((v) => v !== null);
                return (
                  <tr key={p.packId} className="border-t border-cream-100 align-middle">
                    <td className="py-3 pr-4 font-semibold text-teal-500">{p.title}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Spark values={ms} weeks={data.weeks} max={maxMs} format={fmtSecs} label={`${p.title}: median answer time by week`} />
                        <div className="min-w-[5.5rem]">
                          <p className="font-display font-bold text-teal-600">{latestMs != null ? fmtSecs(latestMs) : "—"}</p>
                          {dMs && dMs.first !== dMs.last && (
                            <p className="text-xs text-teal-400">
                              {dMs.last < dMs.first ? "▼" : "▲"} {fmtSecs(Math.abs(dMs.first - dMs.last))}{" "}
                              {dMs.last < dMs.first ? "faster" : "slower"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Spark values={acc} weeks={data.weeks} max={100} format={(v) => `${v}% right`} label={`${p.title}: accuracy by week`} />
                        <div className="min-w-[4.5rem]">
                          <p className="font-display font-bold text-teal-600">{latestAcc != null ? `${latestAcc}%` : "—"}</p>
                          {dAcc && dAcc.first !== dAcc.last && (
                            <p className="text-xs text-teal-400">
                              {dAcc.last > dAcc.first ? "▲" : "▼"} {Math.abs(dAcc.last - dAcc.first)} pts
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {packs.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-teal-400 font-semibold">Weekly numbers</summary>
          <div className="overflow-x-auto mt-2">
            <table className="text-xs text-teal-500">
              <thead>
                <tr>
                  <th className="text-left pr-4 py-1">Pack</th>
                  {data.weeks.map((w) => (
                    <th key={w} className="px-2 py-1 whitespace-nowrap font-semibold">
                      {fmtWeek(w)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p.packId} className="border-t border-cream-100">
                    <td className="pr-4 py-1 whitespace-nowrap">{p.title}</td>
                    {p.weeks.map((w) => (
                      <td key={w.week} className="px-2 py-1 text-center whitespace-nowrap">
                        {w.answered === 0
                          ? "—"
                          : `${w.medianMs != null ? fmtSecs(w.medianMs) : "—"} · ${Math.round((w.accuracy ?? 0) * 100)}% · ${w.answered}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-teal-300 mt-1">Each cell: median time · accuracy · answers.</p>
          </div>
        </details>
      )}
    </div>
  );
}
