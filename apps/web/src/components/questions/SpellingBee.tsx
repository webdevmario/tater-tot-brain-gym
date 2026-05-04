import { useState, useRef, useEffect } from "react";
import type { SessionItem } from "../../lib/api";

type Props = {
  item: SessionItem;
  onAnswer: (userAnswer: string) => void;
  disabled: boolean;
};

// Voices ranked by intelligibility for kid-facing spelling.
// Apple's enhanced/premium voices are dramatically clearer than the
// default robotic fallback; Google's en-US is the next best across
// Chrome/Android. Picked from speechSynthesis.getVoices() at runtime.
const VOICE_PREFERENCE = [
  /Samantha \(Premium\)/i,
  /Samantha \(Enhanced\)/i,
  /Karen \(Premium\)/i,
  /Karen \(Enhanced\)/i,
  /Daniel \(Premium\)/i,
  /Daniel \(Enhanced\)/i,
  /Samantha/i,
  /Karen/i,
  /Daniel/i,
  /Google US English/i,
  /Google UK English Female/i,
  /Microsoft Aria/i,
  /Microsoft Jenny/i,
];

function pickVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  for (const pattern of VOICE_PREFERENCE) {
    const v = voices.find((v) => pattern.test(v.name));
    if (v) return v;
  }
  // Fall back to any local en-* voice (avoids slow remote voices).
  return (
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

export default function SpellingBee({ item, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const text = item.audioText ?? item.prompt;

  // Voices load asynchronously in many browsers — listen for changes
  // and update once the list arrives. Without this, the first item's
  // word can play in the default robotic voice before the good
  // voices register.
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    function load() {
      setVoice(pickVoice(window.speechSynthesis.getVoices()));
    }
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);

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
    utterance.rate = 0.75;
    utterance.pitch = 1;
    utterance.lang = "en-US";
    if (voice) utterance.voice = voice;
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
