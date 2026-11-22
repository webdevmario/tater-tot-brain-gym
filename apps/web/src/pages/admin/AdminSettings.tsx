import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ListSkeleton, Spinner } from "../../components/Loading";
import { loadBuffer, playBuffer } from "../../lib/audio";
import { playSound, type SoundName } from "../../lib/sounds";
import { resetSpeechCache } from "../../lib/speech";

type Voice = { name: string; lang: string; quality: "premium" | "enhanced" | "standard" };
type Speed = "slower" | "normal" | "faster";

const SAMPLE = "Which planet is closest to the sun?";
const SOUNDS: Array<[SoundName, string]> = [
  ["correct", "Correct"],
  ["wrong", "Not Quite"],
  ["streak", "Streak"],
  ["halftime", "Halfway"],
  ["session-end", "Workout Done"],
  ["level-up", "Level Up"],
];

const SPEEDS: Array<[Speed, string]> = [
  ["slower", "Slower"],
  ["normal", "Normal"],
  ["faster", "Faster"],
];

const ACCENTS: Record<string, string> = {
  en_US: "American",
  en_GB: "British",
  en_AU: "Australian",
  en_IE: "Irish",
  en_ZA: "South African",
  en_IN: "Indian",
};
const ACCENT_ORDER = Object.keys(ACCENTS);
const QUALITY_ORDER = { premium: 0, enhanced: 1, standard: 2 };
const SHORTLIST = 4;

/** "Samantha (English (US))" → "Samantha"; "Ava (Premium)" → "Ava". */
function shortName(name: string) {
  return name.replace(/\s*\(.*$/, "");
}

/**
 * The Mac lists every English voice it has, many of them near-duplicates
 * in accents a kid won't want. Show a few: best quality first, then
 * American, one voice per accent, plus whichever one is chosen now.
 */
function shortlist(voices: Voice[], current: string | null): Voice[] {
  const rank = (v: Voice) => {
    const accent = ACCENT_ORDER.indexOf(v.lang);
    return QUALITY_ORDER[v.quality] * 100 + (accent === -1 ? 99 : accent);
  };
  const picked: Voice[] = [];
  const accents = new Set<string>();
  for (const v of [...voices].sort((a, b) => rank(a) - rank(b))) {
    if (picked.length >= SHORTLIST) break;
    const good = v.quality !== "standard";
    if (!good && accents.has(v.lang)) continue;
    picked.push(v);
    accents.add(v.lang);
  }
  const chosen = voices.find((v) => v.name === current);
  if (chosen && !picked.includes(chosen)) picked[picked.length - 1] = chosen;
  return picked;
}

function SpeechSettings() {
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [speed, setSpeed] = useState<Speed>("normal");
  // What's loading/playing: a voice name or "speed:<speed>".
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ voices: Voice[]; current: string | null; speed?: Speed }>("/api/tts/voices")
      .then((d) => {
        setVoices(d.voices);
        setCurrent(d.current);
        if (d.speed) setSpeed(d.speed);
      })
      .catch(() => setVoices([]));
  }, []);

  async function playSample(voice?: string) {
    const q = voice ? `voice=${encodeURIComponent(voice)}&` : "";
    const buf = await loadBuffer(`/api/tts?${q}text=${encodeURIComponent(SAMPLE)}`);
    if (buf) playBuffer(buf);
  }

  // One tap picks the voice and plays it, so there's nothing to miss.
  async function chooseVoice(voice: string) {
    if (busy) return;
    setBusy(voice);
    try {
      if (voice !== current) {
        const d = await api.put<{ current: string }>("/api/tts/voice", { voice });
        setCurrent(d.current);
        resetSpeechCache();
      }
      await playSample(voice);
    } finally {
      setBusy(null);
    }
  }

  async function chooseSpeed(next: Speed) {
    if (busy) return;
    setBusy(`speed:${next}`);
    try {
      if (next !== speed) {
        const d = await api.put<{ speed: Speed }>("/api/tts/speed", { speed: next });
        setSpeed(d.speed);
        resetSpeechCache();
      }
      await playSample();
    } finally {
      setBusy(null);
    }
  }

  const hasGood = voices?.some((v) => v.quality !== "standard");
  const choices = voices ? shortlist(voices, current) : [];

  const tileClass = (on: boolean) =>
    `relative rounded-2xl border-2 px-4 py-3 text-left transition disabled:cursor-wait ${
      on ? "border-teal-400 bg-teal-50" : "border-cream-100 bg-cream-50 hover:border-teal-200"
    }`;

  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold text-teal-500 mb-1">Read-Aloud</h2>
      <p className="text-sm text-teal-400 mb-4">
        How the 🔊 button sounds on every iPad. Tap a choice to hear it.
      </p>

      {voices === null ? (
        <ListSkeleton rows={2} rowHeight={64} />
      ) : voices.length === 0 ? (
        <p className="text-sm text-teal-500">
          This server can't generate speech, so each device uses its own built-in voice.
        </p>
      ) : (
        <>
          <p className="label">Voice</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {choices.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => chooseVoice(v.name)}
                disabled={!!busy}
                aria-pressed={current === v.name}
                className={tileClass(current === v.name)}
              >
                <span className="flex items-center gap-2">
                  <span className="font-display font-bold text-teal-500">{shortName(v.name)}</span>
                  {v.quality !== "standard" && (
                    <span className="text-[10px] uppercase rounded-full bg-spud-100 text-spud-500 px-1.5 py-0.5 font-bold">
                      {v.quality}
                    </span>
                  )}
                  <span className="ml-auto text-teal-400">
                    {busy === v.name ? <Spinner /> : current === v.name ? "✓" : "▶"}
                  </span>
                </span>
                <span className="block text-xs text-teal-400">{ACCENTS[v.lang] ?? v.lang}</span>
              </button>
            ))}
          </div>

          <p className="label">Reading Speed</p>
          <div className="grid grid-cols-3 gap-2">
            {SPEEDS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseSpeed(value)}
                disabled={!!busy}
                aria-pressed={speed === value}
                className={`${tileClass(speed === value)} !text-center font-display font-bold text-teal-500`}
              >
                {label}
                {busy === `speed:${value}` && <Spinner className="ml-2" />}
              </button>
            ))}
          </div>
        </>
      )}

      {voices && voices.length > 0 && !hasGood && (
        <div className="mt-5 rounded-xl bg-spud-50 border border-spud-200 p-3 text-sm text-teal-600">
          <p className="font-semibold">Want a much more natural voice?</p>
          <p className="mt-1">
            On this Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices… →
            English. Download <b>Ava (Premium)</b> or <b>Zoe (Premium)</b>, then reload this page. It shows up
            here as a choice.
          </p>
        </div>
      )}
    </div>
  );
}

function SoundSettings() {
  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold text-teal-500 mb-1">Sound Effects</h2>
      <p className="text-sm text-teal-400 mb-4">
        Tap to hear each one. Kids can mute sounds during a workout with the speaker button.
      </p>
      <div className="flex flex-wrap gap-2">
        {SOUNDS.map(([name, label]) => (
          <button key={name} type="button" onClick={() => playSound(name)} className="btn-secondary !py-2 !px-3 text-sm">
            ▶ {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPin.length < 4) return setStatus({ type: "error", msg: "New PIN needs at least 4 digits" });
    if (newPin !== confirm) return setStatus({ type: "error", msg: "New PINs don't match" });
    try {
      await api.post("/api/admin/pin/change", { oldPin, newPin });
      setStatus({ type: "ok", msg: "PIN changed." });
      setOldPin("");
      setNewPin("");
      setConfirm("");
    } catch (err) {
      setStatus({ type: "error", msg: (err as Error).message });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-display font-bold text-teal-500 mb-6">Settings</h1>

      <div className="space-y-6 mb-6">
        <SpeechSettings />
        <SoundSettings />
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-bold text-teal-500 mb-4">Change PIN</h2>

        {status && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm ${
              status.type === "ok"
                ? "bg-teal-100 text-teal-600"
                : "bg-coral-400/10 text-coral-500"
            }`}
          >
            {status.msg}
          </div>
        )}

        <form onSubmit={changePin} className="space-y-4">
          <div>
            <label className="label">Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input !text-2xl !py-4 !text-center tracking-widest"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input !text-2xl !py-4 !text-center tracking-widest"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Confirm new PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input !text-2xl !py-4 !text-center tracking-widest"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Update PIN
          </button>
        </form>
      </div>

      <div className="card mt-6 !bg-cream-100">
        <h3 className="font-display font-bold text-teal-500 mb-2">If You Forget the PIN</h3>
        <p className="text-sm text-teal-500 mb-2">
          Run this from the repo root to reset:
        </p>
        <pre className="bg-teal-600 text-cream-50 p-3 rounded-lg text-xs whitespace-pre-wrap break-words">
{`pnpm db:studio
# Delete the row in AppSetting where key = 'admin-pin'
# Next time you open /admin, you'll be prompted to set a new one.`}
        </pre>
      </div>
    </div>
  );
}
