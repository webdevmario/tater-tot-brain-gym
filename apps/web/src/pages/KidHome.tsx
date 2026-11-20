import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type KidProgress, type PackProgress, type Session } from "../lib/api";
import KidAvatar from "../components/KidAvatar";
import RankMedal from "../components/RankMedal";
import XpBar from "../components/XpBar";
import WeekRing from "../components/WeekRing";
import BadgeTile from "../components/BadgeTile";
import { subjectStyle } from "../components/subjects";
import { themeButton, themeSurface } from "../lib/theme";

export default function KidHome() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<KidProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!kidId) return;
    api
      .get<KidProgress>(`/api/kids/${kidId}/progress`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [kidId]);

  async function start(packId: string | null) {
    if (!kidId || starting) return;
    setStarting(packId ?? "mixed");
    try {
      const session = await api.post<Session>("/api/sessions", { kidId, packId });
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setStarting(null);
    }
  }

  if (error) {
    return (
      <div className="safe-page min-h-[100dvh] grid place-items-center text-center">
        <div>
          <p className="text-2xl font-display font-semibold mb-4">Couldn't load your gym.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-[100dvh] grid place-items-center text-teal-300">Loading…</div>;
  }

  const { kid, rank, week, packs, badges, stats, theme } = data;
  const toNext = rank.next ? rank.next.minXp - data.totalXp : 0;
  const earned = badges.filter((b) => b.earnedAt);
  // Closest badges to earning — something concrete to aim for.
  const upNext = badges
    .filter((b) => !b.earnedAt)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)
    .slice(0, 3);
  const recent = [...earned]
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
    .slice(0, 3);

  return (
    <div className="safe-page min-h-[100dvh] max-w-5xl mx-auto">
      <nav className="flex items-center justify-between mb-5">
        <Link to="/" className="btn-secondary !py-2 !px-4 !text-base">
          ← Switch kid
        </Link>
        <div className="flex gap-2">
          <Link to={`/kid/${kid.id}/style`} className="btn-secondary !py-2 !px-4 !text-base">
            🎨 Customize
          </Link>
          <Link to={`/kid/${kid.id}/trophies`} className="btn-secondary !py-2 !px-4 !text-base">
            🏆 Trophies <span className="text-teal-300">{earned.length}</span>
          </Link>
        </div>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Rank card: the one loud thing on this screen. */}
        <section
          className="relative overflow-hidden rounded-[2rem] p-6 sm:p-7 text-white"
          style={{ ...themeSurface(theme), boxShadow: `0 6px 0 0 ${theme.shade}` }}
        >
          <div className="flex items-center gap-4">
            <Link to={`/kid/${kid.id}/style`} aria-label="Customize my profile">
              <KidAvatar kid={kid} className="w-20 h-20 !rounded-full !border-4 !border-white/80 bg-white" emojiClassName="text-5xl" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-display font-bold truncate">Hi, {kid.firstName}!</h1>
              {data.title && <p className="text-lg font-display font-semibold text-white/90">{data.title}</p>}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <RankMedal rank={rank} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-white/80 font-semibold">Rank {rank.level}</p>
              <p className="text-4xl font-display font-bold leading-tight">
                {rank.name}
                {rank.stars > 0 && ` ★${rank.stars}`}
              </p>
              <p className="text-white/85 mt-1 font-semibold">{data.totalXp.toLocaleString()} XP</p>
            </div>
          </div>

          {rank.next && (
            <div className="mt-5">
              <XpBar value={rank.xpIntoRank} max={rank.xpForRank} color="#F9CC7A" className="!bg-white/25" />
              <p className="mt-2 text-white/90 font-semibold">
                {toNext} XP to {rank.next.emoji} {rank.next.name}
              </p>
            </div>
          )}
        </section>

        <section className="panel p-6 flex flex-col justify-between gap-5">
          <WeekRing week={week} />
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat value={data.streak} label={data.streak === 1 ? "day streak" : "days streak"} icon="🔥" />
            <Stat value={stats.learned} label="facts learned" icon="🧠" />
            <Stat value={stats.mastered} label="mastered" icon="🏆" />
          </div>
          {!data.practicedToday && data.streak > 0 && (
            <p className="text-center text-spud-500 font-semibold -mt-1">
              One workout today keeps your 🔥 going
            </p>
          )}
        </section>
      </div>

      {packs.length === 0 ? (
        <div className="panel p-6 mt-6 text-center">
          <p className="text-xl font-display font-semibold">No packs turned on yet</p>
          <p className="text-teal-400 mt-1">Ask a grown-up to pick some packs for you.</p>
        </div>
      ) : (
        <>
          <button
            onClick={() => start(null)}
            disabled={!!starting}
            className="btn w-full mt-6 !text-3xl !py-6 !rounded-3xl"
            style={themeButton(theme)}
          >
            {starting === "mixed" ? "Getting ready…" : "💪 Start workout"}
          </button>
          <p className="text-center text-teal-400 mt-2">
            {kid.roundSize} questions, mixed from all your packs. Take your time.
          </p>

          <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">Or train one pack</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((p) => (
              <PackCard key={p.id} pack={p} busy={starting === p.id} onStart={() => start(p.id)} />
            ))}
          </div>
        </>
      )}

      {(recent.length > 0 || upNext.length > 0) && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-display font-bold text-teal-500">
              {recent.length > 0 ? "Trophies" : "Trophies to earn"}
            </h2>
            <Link to={`/kid/${kid.id}/trophies`} className="text-teal-400 font-semibold px-2 py-1">
              See all {badges.length}
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...recent, ...upNext].map((b) => (
              <BadgeTile key={b.code} badge={b} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-cream-50 py-3 px-2">
      <p className="text-3xl font-display font-bold text-teal-600 leading-none">
        <span className="text-2xl mr-1" aria-hidden>
          {icon}
        </span>
        {value}
      </p>
      <p className="text-sm text-teal-400 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function PackCard({ pack, busy, onStart }: { pack: PackProgress; busy: boolean; onStart: () => void }) {
  const s = subjectStyle(pack.subject);
  const learnedPct = pack.total ? (pack.learned / pack.total) * 100 : 0;
  const masteredPct = pack.total ? (pack.mastered / pack.total) * 100 : 0;
  return (
    <button
      onClick={onStart}
      disabled={busy}
      className="panel p-4 text-left flex items-center gap-4 border-2 hover:border-teal-200 active:translate-y-0.5 transition-transform"
    >
      <span
        className="w-14 h-14 shrink-0 rounded-2xl grid place-items-center text-3xl"
        style={{ background: s.tint }}
        aria-hidden
      >
        {s.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold text-lg text-teal-600 leading-tight">
          {busy ? "Getting ready…" : pack.title}
        </span>
        <span className="mt-2 block h-2.5 rounded-full bg-cream-100 overflow-hidden relative">
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${learnedPct}%`, background: s.ink, opacity: 0.35 }} />
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${masteredPct}%`, background: s.ink }} />
        </span>
        <span className="mt-1 block text-sm text-teal-400">
          {pack.learned} of {pack.total} learned
          {pack.mastered > 0 && ` · ${pack.mastered} mastered`}
        </span>
      </span>
    </button>
  );
}
