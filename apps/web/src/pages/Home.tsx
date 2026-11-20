import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Kid } from "../lib/api";
import KidAvatar from "../components/KidAvatar";
import RankMedal from "../components/RankMedal";
import { DEFAULT_THEME, themeSurface } from "../lib/theme";

export default function Home() {
  const [kids, setKids] = useState<Kid[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Kid[]>("/api/kids?summary=1")
      .then(setKids)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="safe-page min-h-[100dvh] flex flex-col items-center">
      <header className="flex flex-col items-center text-center mt-6 mb-10">
        <div className="text-6xl mb-2" aria-hidden>
          🥔
        </div>
        <h1 className="text-6xl md:text-7xl font-display font-bold text-teal-500 tracking-tight">
          Brain Gym
        </h1>
        <p className="text-xl text-teal-400 mt-2">Who's training today?</p>
      </header>

      {error && (
        <div className="panel max-w-lg w-full p-6 border-coral-400 text-coral-500 mb-8">
          <p className="font-bold text-lg">Brain Gym can't reach its server.</p>
          <p className="mt-2 text-teal-500">
            Check that the Mac running Brain Gym is awake and this iPad is connected, then try again.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            Try again
          </button>
          <p className="text-xs mt-3 text-teal-300">{error}</p>
        </div>
      )}

      {kids && kids.length === 0 && (
        <div className="panel max-w-lg w-full p-8 text-center">
          <p className="text-2xl font-display font-semibold mb-2">No profiles yet</p>
          <p className="text-teal-400 mb-6">A grown-up can add kids in the parent area.</p>
          <Link to="/admin" className="btn-primary">
            Add a kid
          </Link>
        </div>
      )}

      {kids && kids.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
          {kids.map((kid, i) => {
            const theme = kid.summary?.theme ?? DEFAULT_THEME;
            return (
            <Link
              key={kid.id}
              to={`/kid/${kid.id}`}
              className="panel group overflow-hidden pb-6 flex flex-col items-center text-center gap-3 border-2 active:scale-[0.98] transition-transform animate-rise"
              style={{ animationDelay: `${i * 60}ms`, borderColor: theme.accent }}
            >
              {/* The kid's color as a banner, avatar overlapping it. */}
              <div className="w-full h-20" style={themeSurface(theme)} aria-hidden />
              <KidAvatar
                kid={kid}
                className="w-28 h-28 !rounded-full -mt-16 !border-4 bg-white"
                style={{ borderColor: theme.accent }}
                emojiClassName="text-6xl"
              />
              <h2 className="text-3xl font-display font-bold text-teal-600 truncate max-w-full px-4">
                {kid.firstName}
              </h2>
              {kid.summary?.title && (
                <p className="-mt-2 font-display font-semibold" style={{ color: theme.accent }}>
                  {kid.summary.title}
                </p>
              )}
              {kid.summary && (
                <div className="flex items-center gap-2 text-teal-500">
                  <RankMedal rank={kid.summary.rank} size="sm" />
                  <span className="font-display font-semibold">{kid.summary.rank.name}</span>
                  {kid.summary.streak > 0 && (
                    <span
                      className="ml-1 rounded-full bg-spud-50 px-2.5 py-0.5 text-sm font-bold text-spud-500"
                      title={`${kid.summary.streak}-day streak`}
                    >
                      🔥 {kid.summary.streak}
                    </span>
                  )}
                </div>
              )}
            </Link>
            );
          })}
        </div>
      )}

      <div className="mt-auto pt-16">
        <Link to="/admin" className="text-teal-300 hover:text-teal-500 text-sm px-3 py-2">
          Parent area
        </Link>
      </div>
    </div>
  );
}
