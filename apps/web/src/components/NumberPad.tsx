import { useEffect, type Dispatch, type SetStateAction } from "react";

type Props = {
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
  onSubmit: () => void;
  disabled?: boolean;
  allowNegative?: boolean;
};

// Big on-screen keypad for math. iPads have no numeric-only keyboard, so
// the system keyboard would cover half the screen with letters. This
// keeps everything in reach of small thumbs. Physical keys work too.
export default function NumberPad({ value, onChange, onSubmit, disabled, allowNegative }: Props) {
  function press(k: string) {
    if (disabled) return;
    // Functional updates: fast double-taps must not read a stale value.
    if (k === "del") return onChange((v) => v.slice(0, -1));
    if (k === "-") return onChange((v) => (v.startsWith("-") ? v.slice(1) : `-${v}`));
    onChange((v) => (v.replace("-", "").length >= 6 ? v : v + k));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "-" && allowNegative) press("-");
      else if (e.key === "Enter" && value !== "") onSubmit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowNegative ? "-" : "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-3 select-none">
      {keys.map((k, i) =>
        k === "" ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => press(k)}
            disabled={disabled}
            aria-label={k === "del" ? "Delete" : k}
            className="btn-secondary !text-3xl !py-4 !rounded-2xl"
          >
            {k === "del" ? "⌫" : k === "-" ? "±" : k}
          </button>
        )
      )}
    </div>
  );
}
