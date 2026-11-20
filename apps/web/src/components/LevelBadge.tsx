import { useId } from "react";

// A level badge: a little shield with a gold star and the level number. On
// light pages the face is the kid's color; on a themed (colored) card it flips
// to a white face so it reads on every gradient, dark or multi-color. The
// darker edge underneath matches the app's pressed-button look.

type Props = {
  level: number;
  color: string;
  /** Darker edge under the shield; the theme's `shade`. */
  shade?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Not reached yet: drawn quietly in grey. */
  dim?: boolean;
  /** White face with a colored number, for sitting on a themed (colored) surface. */
  onColor?: boolean;
  className?: string;
};

// Width in px; height follows the shield's 64:74 shape.
const SIZES = { sm: 30, md: 48, lg: 64, xl: 112 };

const SHIELD =
  "M32 4 L55 11.5 Q57 12.2 57 14.3 V33 C57 50 46 61 32 67.5 C18 61 7 50 7 33 V14.3 Q7 12.2 9 11.5 Z";
// The left half, for a soft bevel.
const BEVEL = "M32 8.5 V63 C20.5 57 11 47.5 11 33 V15.5 Z";

function star(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
const STAR = star(32, 20.5, 6.5, 2.8);

export default function LevelBadge({ level, color, shade, size = "md", dim = false, onColor = false, className = "" }: Props) {
  const sheen = useId();
  const w = SIZES[size];
  const fill = dim ? "#E3EEEE" : onColor ? "#fff" : color;
  const edge = dim ? "#C5DADA" : shade ?? "rgba(0,0,0,.35)";
  const ink = dim ? "#8FB5B5" : onColor ? color : "#fff";
  // A white face needs no outline on its number; a colored one does.
  const inkStroke = dim || onColor ? "none" : edge;
  const digits = String(level).length;
  const fontSize = digits === 1 ? 27 : digits === 2 ? 23 : 18;

  return (
    <svg
      viewBox="0 0 64 74"
      width={w}
      height={(w * 74) / 64}
      className={`shrink-0 font-display ${className}`}
      role="img"
      aria-label={`Level ${level}`}
    >
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={dim ? 0 : 0.28} />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={SHIELD} transform="translate(0 3.5)" fill={edge} />
      <path d={SHIELD} fill={fill} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <path d={SHIELD} fill={`url(#${sheen})`} />
      <path d={BEVEL} fill={onColor ? color : "#fff"} opacity={dim ? 0.35 : onColor ? 0.1 : 0.12} />
      <path d={STAR} fill={dim ? "#fff" : "#F9CC7A"} stroke={dim ? "none" : onColor ? "#E09B2D" : "rgba(0,0,0,.15)"} strokeWidth={onColor ? 1.2 : 0.75} />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        fill={ink}
        stroke={inkStroke}
        strokeWidth="3"
        strokeLinejoin="round"
        paintOrder="stroke"
        aria-hidden
      >
        {level}
      </text>
    </svg>
  );
}
