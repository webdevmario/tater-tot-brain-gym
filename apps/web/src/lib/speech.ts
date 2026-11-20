// Text-to-speech for spelling words and read-aloud prompts.
//
// Voices ranked by intelligibility for kids. Apple's enhanced/premium
// voices are dramatically clearer than the default robotic fallback;
// Google's en-US is next best across Chrome/Android.
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

let cachedVoice: SpeechSynthesisVoice | undefined;

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  for (const pattern of VOICE_PREFERENCE) {
    const v = voices.find((v) => pattern.test(v.name));
    if (v) return (cachedVoice = v);
  }
  // Any local en-* voice (avoids slow remote voices).
  cachedVoice =
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en"));
  return cachedVoice;
}

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

if (canSpeak) {
  // Voices load asynchronously; reset the cache when the list arrives.
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = undefined;
  });
}

export function speak(text: string, rate = 0.85): void {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.lang = "en-US";
  const voice = pickVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}
