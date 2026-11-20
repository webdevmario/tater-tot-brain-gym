import { useState, useRef, useEffect } from "react";
import { prefetchSpeech, speak, spellingLine, stopSpeaking } from "../../lib/speech";
import type { QuestionProps } from "./types";

export default function SpellingBee({ item, onAnswer, disabled, reveal }: QuestionProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const word = item.audioText ?? item.prompt;
  const line = spellingLine(word, item.sentence);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
    prefetchSpeech(word, "slow");
    // Like a real spelling bee: word, sentence, word.
    const id = window.setTimeout(() => speak(line), 250);
    return () => {
      window.clearTimeout(id);
      stopSpeaking();
    };
  }, [item.id, word, line]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    inputRef.current?.blur();
    onAnswer(value.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="panel p-6 text-center">
        <p className="text-xl text-teal-400 font-semibold mb-4">Listen, then spell the word</p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => speak(line)} className="btn-spud !text-2xl !py-5 !px-8">
            🔊 Hear it again
          </button>
          <button type="button" onClick={() => speak(word, "slow")} className="btn-secondary !text-2xl !py-5 !px-6">
            🐢 Slowly
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        className={`input !text-3xl !py-5 text-center font-bold tracking-wide !rounded-3xl ${
          reveal ? (reveal.correct ? "!border-teal-300 !bg-teal-50" : "!border-coral-400 animate-wiggle") : ""
        }`}
        placeholder="Spell it here"
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
