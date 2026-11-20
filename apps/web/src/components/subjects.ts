// Visual identity per subject: an emoji and a tile tint.
export const SUBJECTS: Record<string, { emoji: string; tint: string; ink: string }> = {
  math: { emoji: "🔢", tint: "#E3F0FF", ink: "#2563EB" },
  "language-arts": { emoji: "📖", tint: "#F3E8FF", ink: "#7C3AED" },
  spelling: { emoji: "🐝", tint: "#FFF4D6", ink: "#B7791F" },
  geography: { emoji: "🗺️", tint: "#E3F6EA", ink: "#2F855A" },
  science: { emoji: "🔬", tint: "#E0F5F5", ink: "#1F7F7F" },
  custom: { emoji: "⭐", tint: "#FDE8E4", ink: "#C2410C" },
};

export function subjectStyle(subject: string) {
  return SUBJECTS[subject] ?? SUBJECTS.custom;
}
