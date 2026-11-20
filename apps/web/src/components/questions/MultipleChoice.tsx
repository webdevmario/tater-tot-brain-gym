import { useMemo } from "react";
import type { QuestionProps } from "./types";

/** Fisher–Yates; a fresh order each time a question is shown. */
function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MultipleChoice({ item, prompt, onAnswer, disabled, reveal }: QuestionProps) {
  // Shuffled so the right answer's position (A–D) never gives it away,
  // and a repeated question can't be answered from memory of where it was.
  const choices = useMemo(() => shuffled(item.choices ?? []), [item.id, item.choices]);

  function stateFor(choice: string) {
    if (!reveal) return "idle";
    if (choice === reveal.answer) return "right";
    if (choice === reveal.picked) return "wrong";
    return "dim";
  }

  return (
    <div className="space-y-5">
      {prompt}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice, i) => {
          const st = stateFor(choice);
          return (
            <button
              key={i}
              onClick={() => !disabled && onAnswer(choice)}
              disabled={disabled}
              className={`btn !justify-start !text-left !text-2xl !font-body !font-bold !py-5 !px-5 border-2 !border-b-4 w-full ${
                st === "right"
                  ? "bg-teal-50 border-teal-300 !border-b-teal-400 text-teal-600 animate-confirm"
                  : st === "wrong"
                  ? "bg-coral-400/10 border-coral-400 !border-b-coral-500 text-coral-500 animate-wiggle"
                  : st === "dim"
                  ? "bg-white border-teal-100 text-teal-300 opacity-60"
                  : "bg-white border-teal-100 !border-b-teal-200 text-teal-600 hover:border-teal-200"
              } disabled:!opacity-100`}
            >
              <span
                className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center text-base font-display ${
                  st === "right" ? "bg-teal-300 text-white" : st === "wrong" ? "bg-coral-400 text-white" : "bg-cream-100 text-teal-400"
                }`}
                aria-hidden
              >
                {st === "right" ? "✓" : st === "wrong" ? "✕" : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0">{choice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
