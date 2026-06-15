"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeakerButton } from "@/components/shared/speaker-button";
import type { QueueItem } from "@/lib/study/types";

/** First-encounter "meet the word" surface. Shown once per new word, before any
 *  active-recall drill — exposure precedes retrieval. No typing here. */
export function MeetCard({
  card,
  onContinue,
}: {
  card: QueueItem;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium text-reward">
        <Sparkles className="size-4" /> New word
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-display text-4xl font-semibold">{card.word}</h2>
          <SpeakerButton text={card.word} audioUrl={card.audioUrl} />
          <Badge variant="secondary">{card.pos}</Badge>
        </div>
        {card.ipa && (
          <p className="font-mono text-muted-foreground">{card.ipa}</p>
        )}
      </div>

      <dl className="space-y-2 text-lg">
        <div className="flex gap-2">
          <dt className="sr-only">Uzbek meaning</dt>
          <dd>{card.meaningUz}</dd>
        </div>
        <div className="flex gap-2 text-muted-foreground">
          <dt className="sr-only">English meaning</dt>
          <dd>{card.meaningEn}</dd>
        </div>
      </dl>

      {card.example && (
        <figure className="space-y-1 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-start gap-1">
            <p className="text-pretty text-lg">{card.example.en}</p>
            <SpeakerButton
              text={card.example.en}
              audioUrl={card.example.audioUrl}
              size="icon-sm"
              className="mt-0.5 shrink-0"
            />
          </div>
          <figcaption className="text-sm text-muted-foreground">
            {card.example.uz}
          </figcaption>
        </figure>
      )}

      <Button size="lg" className="w-full" onClick={onContinue}>
        Got it — practice
      </Button>
    </div>
  );
}
