"use client";

import { useEffect } from "react";
import { Check, X, SpellCheck2 } from "lucide-react";
import { SpeakerButton } from "@/components/shared/speaker-button";
import { resolveSpeak } from "@/lib/tts/speak";
import { useSettings } from "@/lib/settings/settings-store";
import { cn } from "@/lib/utils";
import type { AnswerStatus } from "@/lib/srs/grade";
import type { QueueItem } from "@/lib/study/types";

/** Shown only AFTER the learner retrieves — reveals answer, meaning, example. */
export function RevealPanel({
  card,
  status,
  typed,
}: {
  card: QueueItem;
  /** typo-aware judgement, or null for self-graded recall */
  status: AnswerStatus | null;
  /** what the learner typed (only meaningful on a near-miss) */
  typed: string;
}) {
  const { ttsAutoplay, ttsVoice } = useSettings((s) => s.settings);

  useEffect(() => {
    if (ttsAutoplay) resolveSpeak(card.word, card.audioUrl, { voiceName: ttsVoice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.cardId]);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-secondary/50 p-5">
      {status === "near" ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-sm font-medium text-foreground">
          <SpellCheck2 className="size-4" />
          Almost — you wrote “{typed.trim()}”
        </div>
      ) : (
        status !== null && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
              status === "correct"
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive",
            )}
          >
            {status === "correct" ? (
              <Check className="size-4" />
            ) : (
              <X className="size-4" />
            )}
            {status === "correct" ? "Correct" : "Not quite"}
          </div>
        )
      )}

      <div className="flex items-center gap-2">
        <span className="font-display text-3xl">{card.answer}</span>
        <SpeakerButton
          text={card.word}
          audioUrl={card.audioUrl}
          label={`Hear "${card.word}"`}
        />
        {card.ipa && (
          <span className="font-mono text-sm text-muted-foreground">
            {card.ipa}
          </span>
        )}
      </div>

      <p className="text-muted-foreground">
        <span className="text-foreground">{card.meaningEn}</span> · {card.meaningUz}
      </p>

      {card.example && (
        <div className="flex items-start gap-2 border-t border-border pt-3">
          <SpeakerButton
            text={card.example.en}
            audioUrl={card.example.audioUrl}
            label="Hear example sentence"
            className="-ml-2 shrink-0"
          />
          <div>
            <p className="italic">{card.example.en}</p>
            <p className="text-sm text-muted-foreground">{card.example.uz}</p>
          </div>
        </div>
      )}
    </div>
  );
}
