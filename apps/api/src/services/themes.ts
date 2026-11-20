/**
 * Kid color themes. Six are free from day one so there's a real choice
 * immediately; the rest unlock by level, which gives older kids a reason
 * to keep climbing. `minLevel` matches LEVELS in progression.ts.
 */

export type Theme = {
  id: string;
  name: string;
  minLevel: number;
  gradient: string; // hero card / profile card background (white text sits on it)
  accent: string; // buttons, progress bars, avatar ring
  shade: string; // pressed-edge shadow under accent buttons
  pattern?: "stars" | "sparkles";
};

export const THEMES: Theme[] = [
  { id: "teal", name: "Brain Gym", minLevel: 1, gradient: "linear-gradient(140deg,#1F7F7F,#0A4848)", accent: "#1F7F7F", shade: "#0A4848" },
  { id: "ocean", name: "Ocean", minLevel: 1, gradient: "linear-gradient(140deg,#3B82F6,#1E3A8A)", accent: "#2563EB", shade: "#1E3A8A" },
  { id: "grape", name: "Grape", minLevel: 1, gradient: "linear-gradient(140deg,#8B5CF6,#4C1D95)", accent: "#7C3AED", shade: "#4C1D95" },
  { id: "berry", name: "Berry", minLevel: 1, gradient: "linear-gradient(140deg,#EC4899,#831843)", accent: "#DB2777", shade: "#831843" },
  { id: "forest", name: "Forest", minLevel: 1, gradient: "linear-gradient(140deg,#22C55E,#14532D)", accent: "#16A34A", shade: "#14532D" },
  { id: "tangerine", name: "Tangerine", minLevel: 1, gradient: "linear-gradient(140deg,#FB923C,#9A3412)", accent: "#EA580C", shade: "#9A3412" },
  { id: "sunset", name: "Sunset", minLevel: 3, gradient: "linear-gradient(140deg,#7C3AED,#E11D48 55%,#F59E0B)", accent: "#E11D48", shade: "#881337" },
  { id: "arctic", name: "Arctic", minLevel: 4, gradient: "linear-gradient(140deg,#38BDF8,#0E7490 60%,#164E63)", accent: "#0891B2", shade: "#164E63" },
  { id: "galaxy", name: "Galaxy", minLevel: 5, gradient: "linear-gradient(140deg,#1E1B4B,#4C1D95 60%,#0F172A)", accent: "#6D28D9", shade: "#1E1B4B", pattern: "stars" },
  { id: "neon", name: "Neon", minLevel: 6, gradient: "linear-gradient(140deg,#C026D3,#7C3AED 50%,#0891B2)", accent: "#C026D3", shade: "#701A75" },
  { id: "lava", name: "Lava", minLevel: 7, gradient: "linear-gradient(140deg,#F97316,#DC2626 45%,#1C1917)", accent: "#DC2626", shade: "#7F1D1D" },
  { id: "shadow", name: "Shadow", minLevel: 8, gradient: "linear-gradient(140deg,#374151,#111827)", accent: "#374151", shade: "#030712", pattern: "sparkles" },
  { id: "rainbow", name: "Rainbow", minLevel: 9, gradient: "linear-gradient(140deg,#EF4444,#F59E0B 25%,#22C55E 50%,#3B82F6 75%,#8B5CF6)", accent: "#8B5CF6", shade: "#4C1D95" },
  { id: "gold", name: "Gold", minLevel: 10, gradient: "linear-gradient(140deg,#EAB308,#B45309 55%,#78350F)", accent: "#CA8A04", shade: "#78350F", pattern: "sparkles" },
];

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Themes newly available after climbing from one rank level to another. */
export function themesUnlockedBetween(fromLevel: number, toLevel: number): Theme[] {
  return THEMES.filter((t) => t.minLevel > fromLevel && t.minLevel <= toLevel);
}
