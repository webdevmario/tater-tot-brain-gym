import { useEffect, useRef } from "react";

/**
 * Measures how long a question was actually on screen. The clock pauses
 * while the app is in the background or the window loses focus, so a
 * kid who wanders off mid-question doesn't record a 10-minute answer.
 * Used only for grown-up stats; kids never see time.
 */
export function useActiveClock() {
  const elapsed = useRef(0);
  const since = useRef<number | null>(null);

  useEffect(() => {
    const pause = () => {
      if (since.current !== null) {
        elapsed.current += performance.now() - since.current;
        since.current = null;
      }
    };
    const resume = () => {
      if (since.current === null && document.visibilityState === "visible") since.current = performance.now();
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pagehide", pause);
    };
  }, []);

  return useRef({
    /** Start timing a new question. */
    restart() {
      elapsed.current = 0;
      since.current = document.visibilityState === "visible" ? performance.now() : null;
    },
    /** Milliseconds of on-screen time since restart(). */
    read() {
      const live = since.current !== null ? performance.now() - since.current : 0;
      return Math.round(elapsed.current + live);
    },
  }).current;
}
