// A level badge: the level number inside a ring in the kid's color.

type Props = {
  level: number;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Not reached yet: drawn quietly in grey. */
  dim?: boolean;
  className?: string;
};

const SIZES = {
  sm: { box: "w-9 h-9", text: "text-base", ring: 3 },
  md: { box: "w-14 h-14", text: "text-2xl", ring: 4 },
  lg: { box: "w-24 h-24", text: "text-5xl", ring: 6 },
  xl: { box: "w-36 h-36", text: "text-7xl", ring: 8 },
};

export default function RankMedal({ level, color, size = "md", dim = false, className = "" }: Props) {
  const s = SIZES[size];
  const c = dim ? "#D6E6E6" : color;
  return (
    <div
      className={`relative shrink-0 rounded-full grid place-items-center bg-white ${s.box} ${className}`}
      style={{ boxShadow: `inset 0 0 0 ${s.ring}px ${c}` }}
      role="img"
      aria-label={`Level ${level}`}
    >
      <span className={`${s.text} font-display font-bold leading-none`} style={{ color: dim ? "#9DC4C4" : color }} aria-hidden>
        {level}
      </span>
    </div>
  );
}
