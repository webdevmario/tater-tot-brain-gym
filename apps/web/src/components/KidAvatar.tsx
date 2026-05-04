import type { Kid } from "../lib/api";

// Render order: photo > emoji > default 🥔.
// Pass any size class string for the wrapper (e.g. "w-24 h-24") plus
// emoji-size class. Wrapper is opaque to flex parents — caller can add
// shrink-0 etc. as needed.
type Props = {
  kid: Pick<Kid, "avatarPath" | "avatarEmoji" | "username">;
  className?: string;
  emojiClassName?: string;
};

export default function KidAvatar({ kid, className = "", emojiClassName = "" }: Props) {
  const base =
    "rounded-2xl bg-spud-100 flex items-center justify-center overflow-hidden border-2 border-teal-200";
  if (kid.avatarPath) {
    return (
      <div className={`${base} ${className}`}>
        <img
          src={kid.avatarPath}
          alt={kid.username}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className={`${base} ${className} ${emojiClassName}`}>
      <span aria-hidden>{kid.avatarEmoji || "🥔"}</span>
    </div>
  );
}
