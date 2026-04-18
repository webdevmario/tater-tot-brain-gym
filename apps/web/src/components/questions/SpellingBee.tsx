import { useState, useRef, useEffect } from "react";
import type { SessionItem } from "../../lib/api";

type Props = {
  item: SessionItem;
  onAnswer: (userAnswer: string) => void;
  disabled: boolean;
};

export default function SpellingBee({ item, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const text = item.audioText ?? item.prompt;

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
    // Auto-speak the word when it appears
    speak();
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function speak() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onAnswer(value.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <button
        type="button"
        onClick={speak}
        className="btn-spud w-full !text-xl !py-6"
      >
        🔊 Hear the word
      </button>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className="input !text-2xl !py-4 text-center"
        placeholder="Spell the word"
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
