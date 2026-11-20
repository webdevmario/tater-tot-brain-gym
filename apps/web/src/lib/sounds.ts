// Sound effects.
//
// Each effect is synthesized with Web Audio: mallet/bell-style tones
// (a few harmonics with a natural exponential decay) instead of flat
// sine beeps. To use a real recording instead, drop
// /public/sounds/<name>.mp3 in place; it's used automatically when
// present. See public/sounds/README.md.

import { audioContext, loadBuffer, playBuffer } from "./audio";

export type SoundName = "correct" | "wrong" | "halftime" | "streak" | "session-end" | "level-up";

const MUTE_KEY = "ttbg-sounds-muted";

type Note = { freq: number; at: number; dur?: number; vol?: number };
type Voice = "marimba" | "bell" | "soft";

// Harmonic recipes: [multiple of fundamental, relative level, decay factor]
const TIMBRE: Record<Voice, Array<[number, number, number]>> = {
  marimba: [
    [1, 1, 1],
    [4, 0.25, 0.35],
    [10, 0.06, 0.15],
  ],
  bell: [
    [1, 1, 1],
    [2.76, 0.4, 0.6],
    [5.4, 0.18, 0.4],
    [8.93, 0.08, 0.25],
  ],
  soft: [
    [1, 1, 1],
    [2, 0.2, 0.5],
  ],
};

const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

const EFFECTS: Record<SoundName, { voice: Voice; notes: Note[] }> = {
  // Bright rising major third + fifth: unmistakably "yes".
  correct: { voice: "marimba", notes: [{ freq: C6, at: 0 }, { freq: E6, at: 0.07 }, { freq: G6, at: 0.14, dur: 0.6 }] },
  // Gentle, low, two soft notes. Says "hmm", not "buzz".
  wrong: { voice: "soft", notes: [{ freq: 330, at: 0, vol: 0.7 }, { freq: 277, at: 0.14, dur: 0.5, vol: 0.6 }] },
  halftime: { voice: "bell", notes: [{ freq: G5, at: 0 }, { freq: C6, at: 0.12, dur: 0.9 }] },
  streak: {
    voice: "marimba",
    notes: [C5, E5, G5, C6, E6].map((freq, i) => ({ freq, at: i * 0.06, dur: 0.5 })),
  },
  "session-end": {
    voice: "bell",
    notes: [
      { freq: C5, at: 0 },
      { freq: E5, at: 0.12 },
      { freq: G5, at: 0.24 },
      { freq: C6, at: 0.36, dur: 1.4 },
      { freq: E6, at: 0.36, dur: 1.4, vol: 0.5 },
    ],
  },
  "level-up": {
    voice: "bell",
    notes: [
      ...[C5, D5, E5, G5, A5, C6].map((freq, i) => ({ freq, at: i * 0.07, dur: 0.4, vol: 0.7 })),
      { freq: C6, at: 0.5, dur: 1.6 },
      { freq: G6, at: 0.5, dur: 1.6, vol: 0.4 },
    ],
  },
};

function synth(name: SoundName, volume: number) {
  const c = audioContext();
  if (!c) return;
  const { voice, notes } = EFFECTS[name];
  const t0 = c.currentTime + 0.01;

  // Light lowpass keeps high harmonics from sounding harsh on iPad speakers.
  const master = c.createGain();
  master.gain.value = volume;
  const tone = c.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 6000;
  master.connect(tone).connect(c.destination);

  for (const n of notes) {
    const dur = n.dur ?? 0.35;
    for (const [mult, level, decay] of TIMBRE[voice]) {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq * mult;
      const peak = (n.vol ?? 1) * level * 0.5;
      const start = t0 + n.at;
      const end = start + dur * decay;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(g).connect(master);
      osc.start(start);
      osc.stop(end + 0.05);
    }
  }
}

// Recorded overrides: checked once per name; a 404 just means "use synth".
const override = new Map<SoundName, AudioBuffer | null>();

export function preloadSounds(): void {
  (Object.keys(EFFECTS) as SoundName[]).forEach((name) =>
    loadBuffer(`/sounds/${name}.mp3`).then((buf) => override.set(name, buf))
  );
}

export function playSound(name: SoundName, volume = 0.35): void {
  if (isMuted()) return;
  const recorded = override.get(name);
  if (recorded) playBuffer(recorded, volume * 2);
  else synth(name, volume);
}

export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
  } catch {
    // private mode: mute just won't persist
  }
}
