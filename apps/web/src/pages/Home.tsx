import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Kid } from "../lib/api";

export default function Home() {
  const [kids, setKids] = useState<Kid[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Kid[]>("/api/kids")
      .then(setKids)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10">
      <header className="flex flex-col items-center gap-2 mb-12 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-spud-400 font-bold">
          Tater Tot Academy
        </p>
        <h1 className="text-6xl md:text-7xl font-display font-bold text-teal-500 tracking-tight">
          Brain Gym
        </h1>
        <p className="text-lg text-teal-400 mt-2">Who's working out today?</p>
      </header>

      {error && (
        <div className="card max-w-lg w-full bg-coral-400/10 border-coral-400 text-coral-500 mb-8">
          <p className="font-bold">Can't reach the app.</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2">
            Is the API running? Check that <code>pnpm dev</code> is active.
          </p>
        </div>
      )}

      {kids && kids.length === 0 && (
        <div className="card max-w-lg w-full text-center">
          <p className="text-xl mb-4">No kids set up yet.</p>
          <p className="text-teal-400 mb-6">
            An adult needs to set up profiles in admin mode first.
          </p>
          <Link to="/admin" className="btn-primary">
            Go to Admin
          </Link>
        </div>
      )}

      {kids && kids.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {kids.map((kid) => (
            <Link
              key={kid.id}
              to={`/kid/${kid.id}`}
              className="card hover:scale-105 transition-transform flex items-center gap-6 group"
            >
              <div className="shrink-0 w-24 h-24 rounded-2xl bg-spud-100 flex items-center justify-center text-5xl overflow-hidden border-2 border-teal-200">
                {kid.avatarPath ? (
                  <img
                    src={kid.avatarPath}
                    alt={kid.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>🥔</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-display font-semibold text-teal-500 group-hover:text-teal-400 truncate">
                  @{kid.username}
                </h2>
                <p className="text-teal-400 mt-1 truncate">
                  {kid.firstName} {kid.lastName} · Grade {kid.grade}
                </p>
              </div>
              <div className="text-teal-300 text-3xl group-hover:text-teal-400 group-hover:translate-x-1 transition-transform">
                →
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-16">
        <Link to="/admin" className="text-teal-300 hover:text-teal-500 text-sm">
          Adult? Admin Mode →
        </Link>
      </div>
    </div>
  );
}
