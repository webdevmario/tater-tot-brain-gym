import type { CSSProperties } from "react";
import type { Theme } from "./api";

export const DEFAULT_THEME: Theme = {
  id: "teal",
  name: "Brain Gym",
  minLevel: 1,
  gradient: "linear-gradient(140deg,#1F7F7F,#0A4848)",
  accent: "#1F7F7F",
  shade: "#0A4848",
};

const PATTERNS: Record<string, string> = {
  // Scattered dots read as a starfield over the dark Galaxy gradient.
  stars: [
    "radial-gradient(1.5px 1.5px at 12% 22%, #fff 99%, transparent)",
    "radial-gradient(1px 1px at 32% 68%, #fff 99%, transparent)",
    "radial-gradient(2px 2px at 54% 18%, #fde68a 99%, transparent)",
    "radial-gradient(1px 1px at 72% 48%, #fff 99%, transparent)",
    "radial-gradient(1.5px 1.5px at 88% 80%, #fff 99%, transparent)",
    "radial-gradient(1px 1px at 22% 88%, #c4b5fd 99%, transparent)",
    "radial-gradient(1.5px 1.5px at 92% 12%, #fff 99%, transparent)",
  ].join(","),
  sparkles: [
    "radial-gradient(2px 2px at 18% 30%, rgba(255,255,255,.7) 99%, transparent)",
    "radial-gradient(1.5px 1.5px at 62% 20%, rgba(255,255,255,.6) 99%, transparent)",
    "radial-gradient(2px 2px at 82% 70%, rgba(255,255,255,.7) 99%, transparent)",
    "radial-gradient(1.5px 1.5px at 38% 78%, rgba(255,255,255,.5) 99%, transparent)",
  ].join(","),
};

/** Background for big themed surfaces (hero card, profile card). */
export function themeSurface(t: Theme): CSSProperties {
  const pattern = t.pattern ? PATTERNS[t.pattern] : null;
  return { background: pattern ? `${pattern},${t.gradient}` : t.gradient };
}

/** A solid button in the kid's color; use with .btn (its edge is the bottom border). */
export function themeButton(t: Theme): CSSProperties {
  return { background: t.accent, color: "#fff", borderBottomColor: t.shade };
}
