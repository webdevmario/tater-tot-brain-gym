// Generated tones — no asset files needed.
//
// Uses Web Audio API to synthesize short beeps so we don't have to
// ship MP3s. Quality is "calculator app" (no warmth, no personality)
// but the timing is exact and there's nothing to download. When/if
// real SFX files land later, swap this back to HTMLAudioElement.
//
// iOS Safari blocks the AudioContext until user interaction. The
// first kid tap (Start Workout button, etc.) unlocks it. After that,
// every call plays.

export type SoundName =
  | "correct"
  | "wrong"
  | "halftime"
  | "streak"
  | "session-end";

const MUTE_KEY = "ttbg-sounds-muted";

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

type Step = { freq: number; duration: number };
type ToneSpec = {
  steps: Step[];
  type?: OscillatorType;
};

// Frequencies in Hz. Notes: C5 ≈ 523, E5 ≈ 659, G5 ≈ 784, C6 ≈ 1047,
// E6 ≈ 1319. Sine waves to keep things gentle on small speakers.
const TONES: Record<SoundName, ToneSpec> = {
  correct: {
    // Two-note rising "ding" — major third
    steps: [
      { freq: 1047, duration: 0.07 }, // C6
      { freq: 1319, duration: 0.13 }, // E6
    ],
  },
  wrong: {
    // Soft descending "uh-oh" — half step down
    steps: [
      { freq: 440, duration: 0.1 }, // A4
      { freq: 392, duration: 0.18 }, // G4
    ],
    type: "triangle",
  },
  halftime: {
    // Major triad arpeggio (rising)
    steps: [
      { freq: 523, duration: 0.1 }, // C5
      { freq: 659, duration: 0.1 }, // E5
      { freq: 784, duration: 0.18 }, // G5
    ],
  },
  streak: {
    // Quick two-note encouragement
    steps: [
      { freq: 587, duration: 0.1 }, // D5
      { freq: 880, duration: 0.16 }, // A5
    ],
  },
  "session-end": {
    // Triumphant fanfare
    steps: [
      { freq: 523, duration: 0.09 }, // C5
      { freq: 659, duration: 0.09 }, // E5
      { freq: 784, duration: 0.09 }, // G5
      { freq: 1047, duration: 0.25 }, // C6
    ],
  },
};

export function playSound(name: SoundName, volume = 0.18): void {
  if (typeof window === "undefined") return;
  if (isMuted()) return;
  const ctx = getContext();
  const spec = TONES[name];
  if (!ctx || !spec) return;

  let t = ctx.currentTime;
  for (const { freq, duration } of spec.steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type ?? "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Click-free envelope: fast attack, sustain, fast release
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.setValueAtTime(volume, t + duration - 0.025);
    gain.gain.linearRampToValueAtTime(0, t + duration);

    osc.start(t);
    osc.stop(t + duration + 0.02);

    t += duration;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "true";
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
}
