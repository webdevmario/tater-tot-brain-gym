import { useState, useRef, useEffect } from "react";
import type { SessionItem } from "../../lib/api";

type Props = {
  item: SessionItem;
  onAnswer: (userAnswer: string) => void;
  disabled: boolean;
};

export default function TypeAnswer({ item, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [item.id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onAnswer(value.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="input !text-2xl !py-4 text-center"
        placeholder="Type your answer"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="btn-primary w-full !text-xl !py-4"
      >
        Submit
      </button>
    </form>
  );
}
