// Tiny audio helper for short SFX feedback during a workout.
//
// Files live at apps/web/public/sounds/*.mp3 (see the README in that
// folder for what to drop in). If a file is missing, play() rejects
// silently — sound is enhancement, never required.
//
// Mute is persisted in localStorage so a parent can disable sound
// once and have it stick.

export type SoundName =
  | "correct"
  | "wrong"
  | "halftime"
  | "streak"
  | "session-end";

const FILES: Record<SoundName, string> = {
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  halftime: "/sounds/halftime.mp3",
  streak: "/sounds/streak.mp3",
  "session-end": "/sounds/session-end.mp3",
};

const MUTE_KEY = "ttbg-sounds-muted";
const cache = new Map<SoundName, HTMLAudioElement>();

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(FILES[name]);
    audio.preload = "auto";
    cache.set(name, audio);
  }
  return audio;
}

export function playSound(name: SoundName, volume = 0.6): void {
  if (typeof window === "undefined") return;
  if (isMuted()) return;
  const audio = getAudio(name);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {
    // Swallow: file missing (404), browser autoplay block before
    // first user interaction, or a transient decode error. Never
    // surface — sound is feedback, not function.
  });
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "true";
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
}
