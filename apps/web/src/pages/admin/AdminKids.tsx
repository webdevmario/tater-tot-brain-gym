import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Kid, type Pack } from "../../lib/api";
import { getCache, setCache } from "../../lib/cache";
import KidAvatar from "../../components/KidAvatar";

// Curated kid-friendly emoji set for the avatar picker. Roughly one
// row per category. The "type your own" input below the grid lets a
// kid pick anything outside this list (compound emoji like 🦸‍♀️ are
// fine — the maxLength={6} input handles ZWJ sequences up to ~16
// codepoints in practice).
const AVATAR_EMOJIS = [
  "🦊", "🐶", "🐱", "🐼", "🦁", "🐯", "🐻", "🐰", "🐧", "🐸",
  "🐵", "🐢", "🐝", "🦋", "🦄", "🐙", "🐳", "🦖", "🐉", "🦅",
  "🍕", "🍔", "🍦", "🍩", "🍪", "🍓", "🥕", "🍎", "🍌", "🥑",
  "⭐", "🌟", "⚡", "🔥", "🌈", "☀️", "🌙", "❄️", "⚽", "🏀",
  "🎾", "🚀", "🎨", "🎮", "🎵", "🎯", "🎲", "🧩", "🦸", "🥷",
];


export default function AdminKids() {
  const [kids, setKids] = useState<Kid[] | null>(getCache<Kid[]>("kids") ?? null);
  const [packs, setPacks] = useState<Pack[] | null>(getCache<Pack[]>("packs") ?? null);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const [k, p] = await Promise.all([
      api.get<Kid[]>("/api/kids"),
      api.get<Pack[]>("/api/packs"),
    ]);
    setKids(k);
    setCache("kids", k);
    setPacks(p);
    setCache("packs", p);
  }

  async function deleteKid(id: string) {
    if (!confirm("Delete this kid and all their progress? This can't be undone.")) return;
    await api.delete(`/api/kids/${id}`);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-teal-500">Kids</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">
          + Add kid
        </button>
      </div>

      <div className="grid gap-4">
        {kids?.map((kid) => (
          <div key={kid.id} className="card flex items-center gap-4">
            <KidAvatar kid={kid} className="shrink-0 w-16 h-16" emojiClassName="text-2xl" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-xl text-teal-500 truncate">
                {kid.firstName} {kid.lastName}
                <span className="ml-2 text-base font-normal text-teal-400">@{kid.username}</span>
              </h3>
              <p className="text-sm text-teal-400 truncate">
                Grade {kid.grade} · {kid.sessionMinutes} min sessions · {kid.weeklyGoal}×/week
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to={`/admin/progress/${kid.id}`} className="btn-secondary !py-2 !px-3 text-sm">
                Progress
              </Link>
              <button
                onClick={async () => {
                  // Refetch with enabledPacks so the form shows
                  // currently-selected packs as checked.
                  const full = await api.get<Kid>(`/api/kids/${kid.id}`);
                  setEditing(full);
                }}
                className="btn-secondary !py-2 !px-3 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => deleteKid(kid.id)}
                className="btn-danger !py-2 !px-3 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {kids?.length === 0 && (
          <div className="card text-center text-teal-400">
            No kids yet. Click "Add kid" to create the first profile.
          </div>
        )}
      </div>

      {(editing || creating) && (
        <KidForm
          kid={editing}
          packs={packs ?? []}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function KidForm({
  kid,
  packs,
  onClose,
}: {
  kid: Kid | null;
  packs: Pack[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: kid?.firstName ?? "",
    lastName: kid?.lastName ?? "",
    username: kid?.username ?? "",
    avatarEmoji: kid?.avatarEmoji ?? "",
    grade: kid?.grade ?? 2,
    sessionMinutes: kid?.sessionMinutes ?? 12,
    weeklyGoal: kid?.weeklyGoal ?? 3,
  });
  const [enabledPackIds, setEnabledPackIds] = useState<Set<string>>(
    new Set(kid?.enabledPacks?.filter((p) => p.enabled).map((p) => p.packId) ?? [])
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      let savedKid: Kid;
      if (kid) {
        savedKid = await api.put<Kid>(`/api/kids/${kid.id}`, form);
      } else {
        savedKid = await api.post<Kid>("/api/kids", form);
      }
      // Update pack enablements
      for (const pack of packs) {
        const currentlyEnabled = enabledPackIds.has(pack.id);
        const wasEnabled = kid?.enabledPacks?.find((p) => p.packId === pack.id)?.enabled ?? false;
        if (currentlyEnabled !== wasEnabled) {
          await api.post(`/api/kids/${savedKid.id}/packs/${pack.id}`, {
            enabled: currentlyEnabled,
          });
        }
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!kid) {
      alert("Save the kid first, then you can upload an avatar.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      await api.upload(`/api/kids/${kid.id}/avatar`, fd);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!kid) return;
    if (!confirm("Remove this kid's avatar photo?")) return;
    setUploading(true);
    try {
      await api.delete<Kid>(`/api/kids/${kid.id}/avatar`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function togglePack(id: string) {
    setEnabledPackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-teal-600/40 backdrop-blur-sm flex items-center justify-center p-4 z-20">
      <div className="card max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold text-teal-500">
            {kid ? "Edit Kid" : "Add Kid"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center text-3xl leading-none text-teal-400 hover:text-teal-500 hover:bg-cream-100 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="shrink-0 mb-4 p-3 rounded-xl bg-coral-400/10 text-coral-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={save} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Username (unique, can include emoji)</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. roo, big-bear, ⚡flash"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Grade</label>
              <input
                type="number"
                min={0}
                max={12}
                className="input"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Session min</label>
              <input
                type="number"
                min={5}
                max={60}
                className="input"
                value={form.sessionMinutes}
                onChange={(e) =>
                  setForm({ ...form, sessionMinutes: parseInt(e.target.value) || 12 })
                }
              />
            </div>
            <div>
              <label className="label">Weekly goal</label>
              <input
                type="number"
                min={1}
                max={14}
                className="input"
                value={form.weeklyGoal}
                onChange={(e) =>
                  setForm({ ...form, weeklyGoal: parseInt(e.target.value) || 3 })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Avatar</label>
            <div className="flex items-start gap-4 flex-wrap">
              <KidAvatar
                kid={{
                  avatarPath: kid?.avatarPath ?? null,
                  avatarEmoji: form.avatarEmoji || null,
                  username: form.username,
                }}
                className="shrink-0 w-20 h-20"
                emojiClassName="text-3xl"
              />
              <div className="flex-1 min-w-[220px] space-y-3">
                <div>
                  <p className="text-xs text-teal-400 mb-2">Pick an emoji</p>
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            avatarEmoji: form.avatarEmoji === emoji ? "" : emoji,
                          })
                        }
                        className={`w-9 h-9 rounded-lg text-xl leading-none transition ${
                          form.avatarEmoji === emoji
                            ? "bg-teal-300 ring-2 ring-teal-500"
                            : "bg-cream-100 hover:bg-cream-200"
                        }`}
                        aria-label={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={form.avatarEmoji}
                    onChange={(e) => setForm({ ...form, avatarEmoji: e.target.value })}
                    placeholder="…or type one"
                    className="input flex-1 !py-2"
                  />
                  {form.avatarEmoji && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatarEmoji: "" })}
                      className="text-sm text-coral-500 hover:underline shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {kid && (
            <div className="border-t-2 border-cream-100 pt-4">
              <label className="label">Photo (overrides emoji)</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="block text-sm text-teal-500"
                />
                {kid.avatarPath && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={uploading}
                    className="text-sm text-coral-500 hover:underline"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="label">Enabled packs</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {packs.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-cream-50 border-2 border-cream-100 cursor-pointer hover:border-teal-200"
                >
                  <input
                    type="checkbox"
                    checked={enabledPackIds.has(p.id)}
                    onChange={() => togglePack(p.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-teal-500 truncate">{p.title}</p>
                    <p className="text-xs text-teal-400">
                      Gr {p.gradeMin}-{p.gradeMax} · {p._count?.items ?? 0} items
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {packs.length === 0 && (
              <p className="text-sm text-teal-400 italic">
                No packs yet. Seed them with `pnpm seed`.
              </p>
            )}
          </div>

          </div>
          <div className="shrink-0 flex gap-3 pt-4 mt-4 border-t-2 border-cream-100">
            <button type="submit" className="btn-primary flex-1">
              Save
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
