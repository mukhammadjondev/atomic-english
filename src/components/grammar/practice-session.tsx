"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PartyPopper, SpellCheck2, Sparkles, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MarkdownProse } from "@/components/shared/markdown-prose";
import { GradeButtons } from "@/components/study/grade-buttons";
import { celebrate } from "@/lib/celebrate";
import { useKeyboardGrading } from "@/hooks/use-keyboard-grading";
import { useGrammarSession } from "@/lib/grammar/session-store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/content/schema";
import type { GrammarCard, GrammarQueueItem } from "@/lib/grammar/study-types";
import {
  ChoiceExercise,
  SentenceBuildExercise,
  TYPE_LABEL,
  TypedExercise,
} from "./exercise-inputs";

/** Rebuild a content Exercise from the flattened queue item for the shared inputs. */
function toExercise(item: GrammarQueueItem): Exercise {
  const base = {
    id: item.cardId,
    prompt: item.prompt,
    answer: item.answer,
    explanationMd: item.explanationMd,
  };
  switch (item.type) {
    case "fill_blank":
      return { ...base, type: "fill_blank", accepted: item.accepted };
    case "multiple_choice":
      return { ...base, type: "multiple_choice", options: item.options ?? [] };
    case "sentence_build":
      return { ...base, type: "sentence_build" };
    default:
      return { ...base, type: "error_correction" };
  }
}

export function GrammarPracticeSession({ cards }: { cards: GrammarCard[] }) {
  const s = useGrammarSession();

  useEffect(() => {
    s.start(cards);
    return () => s.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  useKeyboardGrading({
    enabled: s.status === "active",
    revealed: s.revealed,
    onGrade: s.grade,
    onReveal: () => {},
  });

  if (s.status === "idle") {
    return <p className="py-20 text-center text-muted-foreground">Loading…</p>;
  }

  if (s.status === "done") {
    return (
      <DoneScreen
        reviewed={s.reviewedCount}
        correct={s.correctCount}
        onUndo={s.undoable ? s.undo : undefined}
      />
    );
  }

  const item = s.current();
  if (!item) return null;
  const exercise = toExercise(item);
  const total = s.queue.length;
  const position = Math.min(s.index + 1, total);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {item.isNew ? "New" : "Review"} · {position}/{total}
          </span>
          <div className="flex items-center gap-3">
            {s.undoable && (
              <button
                type="button"
                onClick={() => void s.undo()}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:text-foreground"
              >
                <Undo2 className="size-3.5" /> Undo
              </button>
            )}
            <span>{s.correctCount} correct</span>
          </div>
        </div>
        <Progress value={(s.index / total) * 100} className="h-1.5" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.cardId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {item.topic} · {TYPE_LABEL[item.type]}
            </span>
          </div>

          {exercise.type === "multiple_choice" ? (
            <ChoiceExercise exercise={exercise} done={s.revealed} onResult={s.answer} />
          ) : exercise.type === "sentence_build" ? (
            <SentenceBuildExercise exercise={exercise} done={s.revealed} onResult={s.answer} />
          ) : (
            <TypedExercise exercise={exercise} done={s.revealed} onResult={s.answer} />
          )}

          {s.revealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <GrammarReveal
                exercise={exercise}
                status={s.lastStatus}
                correct={s.lastCorrect}
                typed={s.lastInput}
              />
              <GradeButtons onGrade={s.grade} suggested={s.suggestedRating} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function GrammarReveal({
  exercise,
  status,
  correct,
  typed,
}: {
  exercise: Exercise;
  status: "correct" | "near" | "wrong" | null;
  correct: boolean | null;
  typed: string;
}) {
  const ok = status === "correct" || (status === null && correct === true);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-secondary/50 p-5">
      {status === "near" ? (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-sm font-medium text-foreground">
          <SpellCheck2 className="size-4" />
          Almost — you wrote “{typed.trim()}”
        </div>
      ) : (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
            ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          {ok ? <Check className="size-4" /> : <X className="size-4" />}
          {ok ? "Correct" : "Not quite"}
        </div>
      )}

      <p>
        <span className="text-muted-foreground">Answer: </span>
        <span className="font-medium">{exercise.answer}</span>
      </p>

      {exercise.explanationMd && (
        <div className="border-t border-border pt-3 text-sm">
          <MarkdownProse markdown={exercise.explanationMd} />
        </div>
      )}
    </div>
  );
}

function DoneScreen({
  reviewed,
  correct,
  onUndo,
}: {
  reviewed: number;
  correct: number;
  onUndo?: () => void;
}) {
  const allCaughtUp = reviewed === 0;

  useEffect(() => {
    if (!allCaughtUp) celebrate();
  }, [allCaughtUp]);

  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-reward-soft text-reward">
        {allCaughtUp ? <Sparkles className="size-8" /> : <PartyPopper className="size-8" />}
      </div>
      <h2 className="font-display text-3xl font-semibold">
        {allCaughtUp ? "All caught up" : "Practice complete"}
      </h2>
      <p className="max-w-sm text-muted-foreground">
        {allCaughtUp
          ? "No grammar due right now. Learn a topic, or come back later."
          : `You practiced ${reviewed} exercise${reviewed === 1 ? "" : "s"} — ${correct} correct on the first try. Nice work.`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/grammar" />}>
          Back to grammar
        </Button>
        {onUndo && (
          <Button variant="ghost" onClick={onUndo}>
            <Undo2 className="size-4" /> Undo last grade
          </Button>
        )}
      </div>
    </div>
  );
}
