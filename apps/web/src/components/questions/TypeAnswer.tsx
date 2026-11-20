import { useState, useRef, useEffect } from "react";
import type { QuestionProps } from "./types";

export default function TypeAnswer({ item, prompt, onAnswer, disabled, reveal }: QuestionProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [item.id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    inputRef.current?.blur(); // drop the iPad keyboard so feedback is visible
    onAnswer(value.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {prompt}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className={`input !text-3xl !py-5 text-center font-bold !rounded-3xl ${
          reveal ? (reveal.correct ? "!border-teal-300 !bg-teal-50" : "!border-coral-400 animate-wiggle") : ""
        }`}
        placeholder="Type your answer"
        enterKeyHint="done"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="submit" disabled={disabled || !value.trim()} className="btn-primary w-full !text-2xl !py-5">
        Check
      </button>
    </form>
  );
}
