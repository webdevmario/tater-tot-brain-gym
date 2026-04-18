import { useState, useRef, useEffect } from "react";
import type { SessionItem } from "../../lib/api";

type Props = {
  item: SessionItem;
  onAnswer: (userAnswer: string) => void;
  disabled: boolean;
};

export default function MathDrill({ item, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [item.id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === "" || disabled) return;
    onAnswer(value.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="input !text-5xl !py-6 text-center font-display font-bold"
        placeholder="?"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={disabled || value === ""}
        className="btn-primary w-full !text-xl !py-4"
      >
        Submit
      </button>
    </form>
  );
}
