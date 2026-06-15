/** English voice discovery + selection for Web Speech (TTS layer 1). */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Voices load asynchronously in some browsers — resolve once they're ready. */
export function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
  });
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("en"));
}

const PREFERRED = /natural|premium|enhanced|google|samantha|aria|ryan|libby/i;

/** Resolve a voice: requested name → preferred high-quality → any English → null. */
export function pickVoice(name?: string | null): SpeechSynthesisVoice | null {
  const en = listEnglishVoices();
  if (name) {
    const exact = en.find((v) => v.name === name);
    if (exact) return exact;
  }
  return en.find((v) => PREFERRED.test(v.name)) ?? en[0] ?? null;
}
