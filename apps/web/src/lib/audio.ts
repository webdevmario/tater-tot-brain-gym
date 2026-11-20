// One shared Web Audio context for sound effects and spoken clips.
//
// iPadOS only lets a page make sound after a tap, and only for audio
// started *inside* that tap. Sound effects and spelling words fire after
// a network round-trip, so they'd be silently blocked. Fix: resume this
// one context on the very first touch; once running, it can play
// anything later.

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Call once at startup. Unlocks audio on the first tap or key press. */
export function installAudioUnlock(): void {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const c = audioContext();
    if (!c) return;
    // A one-sample silent buffer is the reliable iOS unlock.
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    if (c.state === "running") {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    }
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  // iOS suspends the context when the app goes to the background.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state !== "running") {
      window.addEventListener("pointerdown", unlock, true);
    }
  });
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();

/** Fetch and decode an audio file once; later calls reuse it. */
export function loadBuffer(url: string): Promise<AudioBuffer | null> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const c = audioContext();
        if (!c) return null;
        // Safari's decodeAudioData is callback-style on older versions.
        return new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(data, res, rej));
      })
      .catch(() => {
        buffers.delete(url); // allow a retry later
        return null;
      });
    buffers.set(url, p);
  }
  return p;
}

export function playBuffer(buf: AudioBuffer, volume = 1): AudioBufferSourceNode | null {
  const c = audioContext();
  if (!c) return null;
  const src = c.createBufferSource();
  const gain = c.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain).connect(c.destination);
  src.start();
  return src;
}
