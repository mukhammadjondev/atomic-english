/**
 * Thin wrapper over the Web Speech *recognition* API (Chrome/Edge/Safari prefix
 * it `webkitSpeechRecognition`). Lets the learner say a word and get the
 * transcript back to compare against the target. Degrades cleanly: callers check
 * `recognitionSupported()` first.
 */

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return getCtor() !== null;
}

export interface ListenHandle {
  stop(): void;
}

/**
 * Listen for a single spoken phrase. Resolves the best transcript via `onResult`,
 * reports failures via `onError`, and always calls `onEnd`. Returns a handle to
 * stop early. `lang` defaults to en-US.
 */
export function listenOnce({
  lang = "en-US",
  onResult,
  onError,
  onEnd,
}: {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}): ListenHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    onError?.("unsupported");
    return null;
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript ?? "";
    onResult(transcript);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();

  rec.start();
  return { stop: () => rec.stop() };
}
