"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listenOnce, recognitionSupported } from "@/lib/speech/recognition";
import { gradeAnswer, normalizeAnswer } from "@/lib/srs/grade";
import { cn } from "@/lib/utils";

type State = "idle" | "listening" | "correct" | "near" | "wrong";

/**
 * Tap to speak a word; we compare the transcript to the target (typo-tolerant)
 * and show a quick pass/almost/try-again signal. Renders nothing where the
 * browser lacks speech recognition.
 */
export function PronounceButton({ word }: { word: string }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<State>("idle");
  const handleRef = useRef<{ stop(): void } | null>(null);

  // recognitionSupported reads window — resolve after mount to avoid SSR mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only capability check
    setSupported(recognitionSupported());
  }, []);

  if (!supported) return null;

  function listen() {
    if (state === "listening") {
      handleRef.current?.stop();
      return;
    }
    setState("listening");
    handleRef.current = listenOnce({
      onResult: (transcript) => {
        const { status } = gradeAnswer(transcript, word);
        // gradeAnswer compares normalized forms; a spoken match counts as correct
        setState(
          status === "correct"
            ? "correct"
            : normalizeAnswer(transcript).includes(normalizeAnswer(word))
              ? "correct"
              : status === "near"
                ? "near"
                : "wrong",
        );
      },
      onError: () => setState("wrong"),
      onEnd: () => setState((s) => (s === "listening" ? "idle" : s)),
    });
  }

  const icon =
    state === "correct" ? (
      <Check className="text-success" />
    ) : state === "wrong" ? (
      <X className="text-destructive" />
    ) : (
      <Mic className={cn(state === "listening" && "animate-pulse text-primary")} />
    );

  const label =
    state === "near"
      ? "Almost"
      : state === "listening"
        ? "Listening…"
        : "Say it";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={listen}
      aria-label={`Pronounce "${word}"`}
      title={label}
      className="text-muted-foreground hover:text-foreground"
    >
      {icon}
    </Button>
  );
}
