import type { Rank } from "../lib/api";

type Props = {
  rank: Pick<Rank, "emoji" | "color" | "level" | "stars" | "name">;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: { box: "w-9 h-9", emoji: "text-lg", ring: 3 },
  md: { box: "w-14 h-14", emoji: "text-2xl", ring: 4 },
  lg: { box: "w-24 h-24", emoji: "text-5xl", ring: 6 },
  xl: { box: "w-36 h-36", emoji: "text-7xl", ring: 8 },
};

// A rank medallion: the rank's color as a thick ring, emoji in the middle.
export default function RankMedal({ rank, size = "md", className = "" }: Props) {
  const s = SIZES[size];
  return (
    <div
      className={`relative shrink-0 rounded-full grid place-items-center bg-white ${s.box} ${className}`}
      style={{
        boxShadow: `inset 0 0 0 ${s.ring}px ${rank.color}, 0 ${s.ring / 2}px 0 0 ${rank.color}55`,
      }}
      role="img"
      aria-label={`${rank.name} rank`}
    >
      <span className={`${s.emoji} leading-none`} aria-hidden>
        {rank.emoji}
      </span>
      {rank.stars > 0 && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 text-xs font-display font-bold text-white"
          style={{ background: rank.color }}
        >
          ★{rank.stars}
        </span>
      )}
    </div>
  );
}
