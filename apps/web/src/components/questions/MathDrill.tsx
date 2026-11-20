import { useState, useEffect } from "react";
import NumberPad from "../NumberPad";
import type { QuestionProps } from "./types";

export default function MathDrill({ item, prompt, onAnswer, disabled, reveal }: QuestionProps) {
  const [value, setValue] = useState("");

  useEffect(() => setValue(""), [item.id]);

  function submit() {
    if (value === "" || value === "-" || disabled) return;
    onAnswer(value);
  }

  // Side by side on a landscape iPad, stacked in portrait.
  return (
    <div className="grid gap-5 md:landscape:grid-cols-2 md:landscape:items-start">
      <div className="space-y-4">
        {prompt}
        <div
          className={`rounded-3xl border-2 bg-white py-4 text-center font-display font-bold text-6xl min-h-[6rem] ${
            reveal
              ? reveal.correct
                ? "border-teal-300 bg-teal-50 text-teal-500"
                : "border-coral-400 text-coral-500 animate-wiggle"
              : "border-teal-100 text-teal-600"
          }`}
          aria-live="polite"
        >
          {value || <span className="text-teal-100">?</span>}
        </div>
        <button
          onClick={submit}
          disabled={disabled || value === "" || value === "-"}
          className="btn-primary w-full !text-2xl !py-5 hidden md:landscape:flex"
        >
          Check
        </button>
      </div>
      <div className="space-y-4">
        <NumberPad value={value} onChange={setValue} onSubmit={submit} disabled={disabled} allowNegative={false} />
        <button
          onClick={submit}
          disabled={disabled || value === "" || value === "-"}
          className="btn-primary w-full !text-2xl !py-5 md:landscape:hidden"
        >
          Check
        </button>
      </div>
    </div>
  );
}
