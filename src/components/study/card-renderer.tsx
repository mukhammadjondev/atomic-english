"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resolveSpeak } from "@/lib/tts/speak";
import { useSettings } from "@/lib/settings/settings-store";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/lib/study/types";

interface RendererProps {
  card: QueueItem;
  revealed: boolean;
  onSubmitTyped: (input: string) => void;
  onReveal: () => void;
}

/** Routes a card to the right active-recall surface. The answer is never shown
 *  beside the prompt — only the retrieval cue is. */
export function CardRenderer(props: RendererProps) {
  switch (props.card.mode) {
    case "cloze":
      return <ClozeCard {...props} />;
    case "listening":
      return <ListeningCard {...props} />;
    case "sentence_order":
      return <SentenceOrderCard {...props} />;
    case "recall_meaning":
      return <RecallCard {...props} />;
    case "production":
    default:
      return <ProductionCard {...props} />;
  }
}

function useAutoFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}

function TypedField({
  revealed,
  onSubmitTyped,
  placeholder,
  ariaLabel,
}: Pick<RendererProps, "revealed" | "onSubmitTyped"> & {
  placeholder: string;
  ariaLabel: string;
}) {
  const [value, setValue] = useState("");
  const ref = useAutoFocus<HTMLInputElement>(!revealed);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!revealed) onSubmitTyped(value);
      }}
    >
      <Input
        ref={ref}
        value={value}
        disabled={revealed}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="h-12 text-lg"
      />
      {!revealed && (
        <Button type="submit" size="lg" className="h-12 px-5">
          Check
        </Button>
      )}
    </form>
  );
}

function ClozeCard({ card, revealed, onSubmitTyped }: RendererProps) {
  const [before, after] = useMemo(() => {
    const parts = card.prompt.split(/_{2,}/);
    return [parts[0] ?? "", parts.slice(1).join(" ")];
  }, [card.prompt]);

  return (
    <div className="space-y-5">
      <p className="text-pretty text-2xl leading-relaxed">
        {before}
        <span className="mx-1 inline-block min-w-24 border-b-2 border-dashed border-primary/60 align-baseline" />
        {after}
      </p>
      <TypedField
        revealed={revealed}
        onSubmitTyped={onSubmitTyped}
        placeholder="Fill the gap…"
        ariaLabel="Your answer"
      />
      {card.hint && (
        <p className="font-mono text-xs text-muted-foreground">{card.hint}</p>
      )}
    </div>
  );
}

function ProductionCard({ card, revealed, onSubmitTyped }: RendererProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Say it in English
      </p>
      <p className="font-display text-3xl">{card.prompt}</p>
      <TypedField
        revealed={revealed}
        onSubmitTyped={onSubmitTyped}
        placeholder="Type the English word…"
        ariaLabel="Your answer"
      />
    </div>
  );
}

function ListeningCard({ card, revealed, onSubmitTyped }: RendererProps) {
  const voiceName = useSettings((s) => s.settings.ttsVoice);
  const play = () =>
    resolveSpeak(card.word, card.audioUrl, { voiceName });

  useEffect(() => {
    // play once when the card appears
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.cardId]);

  return (
    <div className="space-y-5">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Type what you hear
      </p>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={play}
        className="gap-2"
      >
        <Volume2 /> Play again
      </Button>
      <TypedField
        revealed={revealed}
        onSubmitTyped={onSubmitTyped}
        placeholder="What did you hear?"
        ariaLabel="Your answer"
      />
    </div>
  );
}

function RecallCard({ card, revealed, onReveal }: RendererProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Recall the meaning
      </p>
      <p className="font-display text-4xl">{card.word}</p>
      {card.ipa && (
        <p className="font-mono text-muted-foreground">{card.ipa}</p>
      )}
      {!revealed && (
        <Button type="button" size="lg" onClick={onReveal}>
          Show answer
        </Button>
      )}
    </div>
  );
}

function SentenceOrderCard({ card, revealed, onSubmitTyped }: RendererProps) {
  const tokens = useMemo(() => card.answer.split(/\s+/), [card.answer]);
  const shuffled = useMemo(
    () => seededShuffle(tokens, card.cardId),
    [tokens, card.cardId],
  );
  const [picked, setPicked] = useState<number[]>([]);
  const pickedSet = new Set(picked);

  const built = picked.map((i) => shuffled[i]).join(" ");

  return (
    <div className="space-y-5">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        Put the words in order
      </p>
      <div className="min-h-12 rounded-xl border border-dashed border-border p-3 text-lg">
        {built || <span className="text-muted-foreground">Tap words below…</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {shuffled.map((tok, i) => (
          <button
            key={i}
            type="button"
            disabled={revealed || pickedSet.has(i)}
            onClick={() => setPicked((p) => [...p, i])}
            className={cn(
              "rounded-lg border border-border bg-card px-3 py-1.5 text-base transition-colors hover:bg-muted",
              pickedSet.has(i) && "opacity-30",
            )}
          >
            {tok}
          </button>
        ))}
      </div>
      {!revealed && (
        <div className="flex gap-2">
          <Button type="button" size="lg" onClick={() => onSubmitTyped(built)}>
            Check
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setPicked([])}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
