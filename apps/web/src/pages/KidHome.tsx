import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type Kid, type Session } from "../lib/api";

export default function KidHome() {
  const { kidId } = useParams();
  const navigate = useNavigate();
  const [kid, setKid] = useState<Kid | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!kidId) return;
    api.get<Kid>(`/api/kids/${kidId}`).then(setKid);
  }, [kidId]);

  async function startSession() {
    if (!kidId) return;
    setStarting(true);
    try {
      const session = await api.post<Session>("/api/sessions", { kidId });
      navigate(`/session/${session.id}`);
    } catch (err) {
      alert(`Couldn't start session: ${(err as Error).message}`);
      setStarting(false);
    }
  }

  if (!kid) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const enabledCount = kid.enabledPacks?.filter((p) => p.enabled).length ?? 0;

  return (
    <div className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <Link to="/" className="text-teal-400 hover:text-teal-500 inline-flex items-center gap-1 mb-6">
        ← Back
      </Link>

      <div className="card mb-8 flex items-center gap-6">
        <div className="w-28 h-28 rounded-2xl bg-spud-100 flex items-center justify-center text-5xl overflow-hidden border-2 border-teal-200">
          {kid.avatarPath ? (
            <img src={kid.avatarPath} alt={kid.handle} className="w-full h-full object-cover" />
          ) : (
            <span>🥔</span>
          )}
        </div>
        <div>
          <h1 className="text-5xl font-display font-bold text-teal-500">
            Hi, {kid.firstName}!
          </h1>
          <p className="text-teal-400 mt-2 text-lg">
            @{kid.handle} · Grade {kid.grade} · {enabledCount} pack{enabledCount === 1 ? "" : "s"} ready
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <button
          onClick={startSession}
          disabled={starting || enabledCount === 0}
          className="btn-primary !text-3xl !py-8 !px-10 w-full"
        >
          {starting ? "Getting ready..." : `Start ${kid.sessionMinutes}-min Workout`}
        </button>

        {enabledCount === 0 && (
          <div className="card bg-spud-50 border-spud-200">
            <p className="text-teal-500 font-semibold">
              No packs enabled yet. An adult needs to turn on some packs for you in admin mode.
            </p>
          </div>
        )}

        <div className="card">
          <h2 className="text-2xl font-display font-semibold mb-3">Today's packs</h2>
          {kid.enabledPacks && kid.enabledPacks.length > 0 ? (
            <ul className="space-y-2">
              {kid.enabledPacks
                .filter((p) => p.enabled)
                .map((p) => (
                  <li
                    key={p.packId}
                    className="flex items-center gap-3 text-teal-500"
                  >
                    <span className="text-spud-400">●</span>
                    {p.pack.title}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-teal-400">No packs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
