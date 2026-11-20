import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type KidProgress, type Theme } from "../lib/api";
import { useCachedGet } from "../lib/cache";
import { Bone } from "../components/Loading";
import { themeSurface } from "../lib/theme";
import { playSound } from "../lib/sounds";
import KidAvatar from "../components/KidAvatar";

const AVATARS: Array<[string, string[]]> = [
  ["Animals", ["🦖", "🐉", "🦊", "🐼", "🐯", "🦁", "🐨", "🐸", "🦄", "🐙", "🦈", "🐬", "🦉", "🐺", "🐱", "🐶", "🐧", "🦋"]],
  ["Sports", ["🏀", "⚽", "🏈", "⚾", "🎾", "🏐", "🏒", "⛸️", "🛹", "🏄", "🥋", "🏆"]],
  ["Space & heroes", ["🚀", "🛸", "🪐", "⭐", "🌙", "☄️", "🧙", "🦸", "🥷", "🤖", "👾", "👑"]],
  ["Fun stuff", ["🎮", "🎨", "🎸", "🎧", "📚", "🔬", "🧩", "🍕", "🍩", "🌮", "🧁", "🍉"]],
  ["Nature", ["🌻", "🌵", "🍄", "🌈", "🔥", "⚡", "❄️", "🌊", "🌸", "🍀", "🌋", "🥔"]],
];

export default function Customize() {
  const { kidId } = useParams();
  const { data, setData } = useCachedGet<KidProgress>(kidId ? `/api/kids/${kidId}/progress` : null);
  const [saving, setSaving] = useState(false);

  async function save(patch: { theme?: string; avatarEmoji?: string; titleBadge?: string | null }) {
    if (!data || saving) return;
    // Optimistic: show the change right away, then confirm with the server.
    const prev = data;
    const theme = patch.theme ? data.themes.find((t) => t.id === patch.theme) ?? data.theme : data.theme;
    const title =
      patch.titleBadge === undefined
        ? data.title
        : patch.titleBadge === null
        ? null
        : data.badges.find((b) => b.code === patch.titleBadge)?.label ?? null;
    setData({
      ...data,
      theme,
      title,
      kid: {
        ...data.kid,
        ...(patch.theme ? { theme: patch.theme } : {}),
        ...(patch.avatarEmoji ? { avatarEmoji: patch.avatarEmoji, avatarPath: null } : {}),
        ...(patch.titleBadge !== undefined ? { titleBadge: patch.titleBadge } : {}),
      },
    });
    playSound("correct", 0.2);
    setSaving(true);
    try {
      await api.patch(`/api/kids/${kidId}/style`, patch);
    } catch {
      setData(prev);
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="safe-page min-h-[100dvh] max-w-4xl mx-auto pb-10" aria-busy="true">
        <Link to={`/kid/${kidId}`} className="btn-secondary !py-2 !px-4 !text-base">
          ← Done
        </Link>
        <Bone className="mt-5 h-[144px] !rounded-[2rem]" />
        <Bone className="h-8 w-40 mt-8 mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const { kid, theme, rank } = data;
  const earned = data.badges.filter((b) => b.earnedAt);

  return (
    <div className="safe-page min-h-[100dvh] max-w-4xl mx-auto pb-10">
      <Link to={`/kid/${kid.id}`} className="btn-secondary !py-2 !px-4 !text-base">
        ← Done
      </Link>

      {/* Live preview of the profile card everyone sees. */}
      <section
        className="mt-5 rounded-[2rem] p-6 text-white flex items-center gap-5"
        style={{ ...themeSurface(theme), boxShadow: `0 6px 0 0 ${theme.shade}` }}
      >
        <KidAvatar
          kid={kid}
          className="w-24 h-24 !rounded-full !border-4"
          style={{ borderColor: "rgba(255,255,255,.85)" }}
          emojiClassName="text-6xl"
        />
        <div className="min-w-0">
          <h1 className="text-4xl font-display font-bold truncate">{kid.firstName}</h1>
          <p className="text-xl font-display font-semibold text-white/90 mt-1">
            {data.title ?? `${rank.emoji} ${rank.name}`}
          </p>
        </div>
      </section>

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">My color</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {data.themes.map((t) => (
          <ThemeSwatch
            key={t.id}
            theme={t}
            unlocked={t.unlocked}
            selected={kid.theme === t.id}
            unlockRank={data.ranks.find((r) => r.level === t.minLevel)}
            onPick={() => save({ theme: t.id })}
          />
        ))}
      </div>

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-1">My title</h2>
      <p className="text-teal-400 mb-3">Show off a trophy you've earned under your name.</p>
      <div className="flex flex-wrap gap-2">
        <TitleChip label={`${rank.emoji} ${rank.name}`} hint="my rank" selected={!kid.titleBadge} onPick={() => save({ titleBadge: null })} />
        {earned.map((b) => (
          <TitleChip
            key={b.code}
            label={`${b.emoji} ${b.label}`}
            selected={kid.titleBadge === b.code}
            onPick={() => save({ titleBadge: b.code })}
          />
        ))}
      </div>
      {earned.length < 3 && (
        <p className="text-sm text-teal-400 mt-2">Earn more trophies to unlock more titles.</p>
      )}

      <h2 className="text-2xl font-display font-bold text-teal-500 mt-8 mb-3">My avatar</h2>
      <div className="space-y-4">
        {AVATARS.map(([group, emojis]) => (
          <div key={group}>
            <p className="text-teal-400 font-semibold mb-2">{group}</p>
            <div className="flex flex-wrap gap-2">
              {emojis.map((e) => {
                const selected = !kid.avatarPath && kid.avatarEmoji === e;
                return (
                  <button
                    key={e}
                    onClick={() => save({ avatarEmoji: e })}
                    aria-label={`Use ${e} as avatar`}
                    aria-pressed={selected}
                    className={`w-14 h-14 rounded-2xl grid place-items-center text-3xl border-[3px] transition-transform active:scale-90 ${
                      selected ? "bg-white" : "bg-white/70 border-teal-100"
                    }`}
                    style={selected ? { borderColor: theme.accent, background: `${theme.accent}1f` } : undefined}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeSwatch({
  theme,
  unlocked,
  selected,
  unlockRank,
  onPick,
}: {
  theme: Theme;
  unlocked: boolean;
  selected: boolean;
  unlockRank?: { name: string; emoji: string; color: string; level: number };
  onPick: () => void;
}) {
  return (
    <button
      onClick={unlocked ? onPick : undefined}
      disabled={!unlocked}
      aria-pressed={selected}
      className={`relative rounded-2xl h-24 p-2 flex flex-col justify-end text-left text-white overflow-hidden transition-transform ${
        unlocked ? "active:scale-95" : "cursor-default"
      }`}
      style={{
        ...themeSurface(theme),
        // Selected: a white ring drawn inside the swatch, so it never spills into the grid gap.
        ...(selected ? { boxShadow: "inset 0 0 0 3px #fff, inset 0 0 0 6px rgba(0,0,0,.28)" } : {}),
      }}
    >
      {!unlocked && <span className="absolute inset-0 bg-black/30" aria-hidden />}
      {selected && (
        <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white text-teal-600 grid place-items-center font-bold">
          ✓
        </span>
      )}
      <span className="relative font-display font-semibold leading-tight drop-shadow">{theme.name}</span>
      {!unlocked && unlockRank && (
        <span className="relative mt-1 self-start max-w-full truncate rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-teal-600">
          🔒 {unlockRank.name}
        </span>
      )}
    </button>
  );
}

function TitleChip({ label, hint, selected, onPick }: { label: string; hint?: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={selected}
      className={`rounded-full px-4 py-2 font-display font-semibold border-2 min-h-[44px] ${
        selected ? "bg-teal-500 text-white border-teal-500" : "bg-white text-teal-600 border-teal-100"
      }`}
    >
      {label}
      {hint && <span className={`ml-1 text-sm ${selected ? "text-white/70" : "text-teal-300"}`}>({hint})</span>}
    </button>
  );
}
