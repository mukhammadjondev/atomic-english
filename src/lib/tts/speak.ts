import { ensureVoices, isSpeechSupported, pickVoice } from "./voices";

export { isSpeechSupported } from "./voices";

interface SpeakOptions {
  /** preferred voice name (from settings); falls back automatically */
  voiceName?: string | null;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Speak text with the Web Speech API using the chosen/best English voice. */
export async function speakText(
  text: string,
  { voiceName, lang = "en-US", onStart, onEnd }: SpeakOptions = {},
): Promise<void> {
  if (!isSpeechSupported()) {
    onEnd?.();
    return;
  }
  await ensureVoices();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(voiceName);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? lang;
  u.rate = 0.95;
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

/** Play a pre-generated MP3 (layer-2 audio). Resolves/cleans up on end. */
function playAudioUrl(
  url: string,
  { onStart, onEnd }: Pick<SpeakOptions, "onStart" | "onEnd">,
): void {
  const audio = new Audio(url);
  audio.onplay = () => onStart?.();
  audio.onended = () => onEnd?.();
  audio.onerror = () => onEnd?.();
  void audio.play().catch(() => onEnd?.());
}

/**
 * Progressive enhancement: play the pre-generated MP3 when present, otherwise
 * fall back to Web Speech. The one entry point components should use.
 */
export function resolveSpeak(
  text: string,
  audioUrl?: string | null,
  opts: SpeakOptions = {},
): void {
  if (audioUrl) {
    playAudioUrl(audioUrl, opts);
  } else {
    void speakText(text, opts);
  }
}
