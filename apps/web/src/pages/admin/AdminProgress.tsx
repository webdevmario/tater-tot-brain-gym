import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Kid } from "../../lib/api";

type Progress = {
  kid: Kid;
  totals: { attempts: number; correct: number; accuracy: number };
  mastery: { mastered: number; struggling: number; total: number };
  sessions: Array<{ id: string; startedAt: string; endedAt: string | null; xpEarned: number }>;
  packStats: Array<{ packId: string; title: string; total: number; mastered: number }>;
  strugglingItems: Array<{
    itemId: string;
    prompt: string;
    answer: string;
    packTitle: string;
    lapses: number;
  }>;
  recentAttempts: Array<{
    id: string;
    correct: boolean;
    timedOut: boolean;
    createdAt: string;
    item: { prompt: string; answer: string; pack: { title: string } };
  }>;
};

export default function AdminProgress() {
  const { kidId } = useParams();
  const [data, setData] = useState<Progress | null>(null);

  useEffect(() => {
    if (!kidId) return;
    api.get<Progress>(`/api/admin/progress/${kidId}`).then(setData);
  }, [kidId]);

  if (!data) return <p>Loading...</p>;

  const { kid, totals, mastery, sessions, packStats, strugglingItems, recentAttempts } = data;

  return (
    <div>
      <Link to="/admin/kids" className="text-teal-400 text-sm hover:text-teal-500 mb-4 inline-block">
        ← Kids
      </Link>

      <h1 className="text-3xl font-display font-bold text-teal-500 mb-1">
        {kid.firstName} {kid.lastName}'s progress
      </h1>
      <p className="text-sm text-teal-400 mb-6">
        @{kid.handle} · Grade {kid.grade} · {sessions.length} completed session{sessions.length === 1 ? "" : "s"}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card !py-4 text-center">
          <p className="text-3xl font-display font-bold text-teal-500">{totals.attempts}</p>
          <p className="text-xs uppercase tracking-widest text-teal-400">Attempts</p>
        </div>
        <div className="card !py-4 text-center">
          <p className="text-3xl font-display font-bold text-teal-400">
            {Math.round(totals.accuracy * 100)}%
          </p>
          <p className="text-xs uppercase tracking-widest text-teal-400">Accuracy</p>
        </div>
        <div className="card !py-4 text-center">
          <p className="text-3xl font-display font-bold text-spud-400">{mastery.mastered}</p>
          <p className="text-xs uppercase tracking-widest text-teal-400">Mastered</p>
        </div>
        <div className="card !py-4 text-center">
          <p className="text-3xl font-display font-bold text-coral-400">{mastery.struggling}</p>
          <p className="text-xs uppercase tracking-widest text-teal-400">Struggling</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-xl font-display font-bold text-teal-500 mb-4">
            By pack
          </h2>
          {packStats.length === 0 ? (
            <p className="text-teal-400 text-sm italic">No practice yet.</p>
          ) : (
            <div className="space-y-3">
              {packStats.map((p) => (
                <div key={p.packId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-teal-500">{p.title}</span>
                    <span className="text-teal-400">
                      {p.mastered} / {p.total} mastered
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-cream-100 overflow-hidden">
                    <div
                      className="h-full bg-teal-300"
                      style={{ width: `${p.total > 0 ? (p.mastered / p.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-display font-bold text-teal-500 mb-4">
            Needs attention
          </h2>
          {strugglingItems.length === 0 ? (
            <p className="text-teal-400 text-sm italic">Nothing flagged as struggling yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {strugglingItems.map((s) => (
                <div key={s.itemId} className="text-sm py-2 border-b border-cream-100 last:border-0">
                  <p className="font-semibold text-teal-500">{s.prompt}</p>
                  <p className="text-teal-400 text-xs">
                    Answer: {s.answer} · {s.lapses} lapse{s.lapses === 1 ? "" : "s"} · {s.packTitle}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-bold text-teal-500 mb-4">
          Recent attempts
        </h2>
        {recentAttempts.length === 0 ? (
          <p className="text-teal-400 text-sm italic">No attempts yet.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {recentAttempts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 text-sm py-2 border-b border-cream-100 last:border-0"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    a.correct ? "bg-teal-100 text-teal-500" : "bg-coral-400/20 text-coral-500"
                  }`}
                >
                  {a.correct ? "✓" : a.timedOut ? "⏱" : "✕"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-teal-500">{a.item.prompt}</p>
                  <p className="text-xs text-teal-400">{a.item.pack.title}</p>
                </div>
                <span className="text-xs text-teal-400">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
