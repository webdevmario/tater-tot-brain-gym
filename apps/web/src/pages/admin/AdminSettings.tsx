import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ListSkeleton } from "../../components/Loading";
import { loadBuffer, playBuffer } from "../../lib/audio";
import { playSound, type SoundName } from "../../lib/sounds";

type Voice = { name: string; lang: string; quality: "premium" | "enhanced" | "standard" };

const SAMPLE = "Which planet is closest to the sun?";
const SOUNDS: Array<[SoundName, string]> = [
  ["correct", "Correct"],
  ["wrong", "Not quite"],
  ["streak", "Streak"],
  ["halftime", "Halfway"],
  ["session-end", "Workout done"],
  ["level-up", "Rank up"],
];

function SpeechSettings() {
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ voices: Voice[]; current: string | null }>("/api/tts/voices")
      .then((d) => {
        setVoices(d.voices);
        setCurrent(d.current);
      })
      .catch(() => setVoices([]));
  }, []);

  async function preview(voice: string) {
    const buf = await loadBuffer(`/api/tts?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(SAMPLE)}`);
    if (buf) playBuffer(buf);
  }

  async function choose(voice: string) {
    setSaving(true);
    const d = await api.put<{ current: string }>("/api/tts/voice", { voice });
    setCurrent(d.current);
    setSaving(false);
  }

  const hasGood = voices?.some((v) => v.quality !== "standard");

  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold text-teal-500 mb-1">Reading voice</h2>
      <p className="text-sm text-teal-400 mb-4">
        Read-aloud questions (the 🔊 button) are spoken by this Mac, so every iPad hears the same voice.
      </p>

      {voices === null ? (
        <ListSkeleton rows={3} rowHeight={52} />
      ) : voices.length === 0 ? (
        <p className="text-sm text-teal-500">
          This server can't generate speech, so each device uses its own built-in voice.
        </p>
      ) : (
        <ul className="space-y-2">
          {voices.map((v) => (
            <li key={v.name} className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="voice"
                  checked={current === v.name}
                  disabled={saving}
                  onChange={() => choose(v.name)}
                  className="w-5 h-5"
                />
                <span className="text-teal-600 font-semibold">{v.name}</span>
                <span className="text-xs text-teal-300">{v.lang.replace("_", "-")}</span>
                {v.quality !== "standard" && (
                  <span className="text-xs rounded-full bg-spud-100 text-spud-500 px-2 py-0.5 font-bold">
                    {v.quality}
                  </span>
                )}
              </label>
              <button type="button" onClick={() => preview(v.name)} className="btn-secondary !py-1 !px-3 !min-h-0 text-sm">
                ▶ Try
              </button>
            </li>
          ))}
        </ul>
      )}

      {voices && voices.length > 0 && !hasGood && (
        <div className="mt-4 rounded-xl bg-spud-50 border border-spud-200 p-3 text-sm text-teal-600">
          <p className="font-semibold">Want a much more natural voice?</p>
          <p className="mt-1">
            On this Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices… →
            English. Download <b>Ava (Premium)</b> or <b>Zoe (Premium)</b>, then reload this page. Brain Gym
            picks it automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function SoundSettings() {
  return (
    <div className="card">
      <h2 className="text-xl font-display font-bold text-teal-500 mb-1">Sound effects</h2>
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
        <h2 className="text-xl font-display font-bold text-teal-500 mb-4">Change admin PIN</h2>

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
        <h3 className="font-display font-bold text-teal-500 mb-2">If you forget the PIN</h3>
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
