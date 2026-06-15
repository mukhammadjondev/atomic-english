"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isCorrect, normalizeAnswer } from "@/lib/srs/grade";
import { seededShuffle } from "@/lib/shuffle";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/content/schema";

export const TYPE_LABEL: Record<Exercise["type"], string> = {
  fill_blank: "Fill the blank",
  error_correction: "Correct the mistake",
  multiple_choice: "Choose the right option",
  sentence_build: "Build the sentence",
};

/**
 * The interactive part of a grammar exercise, shared by the topic page's
 * `ExerciseCard` and the SRS practice session. It captures the learner's answer
 * and reports both a quick correctness flag and the raw text — leaving the
 * caller free to grade with typo tolerance (session) or just display it (page).
 */
export interface SubProps<E extends Exercise = Exercise> {
  exercise: E;
  done: boolean;
  onResult: (ok: boolean, raw: string) => void;
}

export function TypedExercise({ exercise, done, onResult }: SubProps) {
  const [value, setValue] = useState("");
  const accepted =
    exercise.type === "fill_blank" ? exercise.accepted : undefined;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!done) onResult(isCorrect(value, exercise.answer, accepted), value);
      }}
    >
      <p className="text-lg leading-relaxed">{exercise.prompt}</p>
      <div className="flex gap-2">
        <Input
          value={value}
          disabled={done}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your answer…"
          aria-label="Your answer"
          autoComplete="off"
          className="h-11"
        />
        {!done && (
          <Button type="submit" className="h-11 px-5">
            Check
          </Button>
        )}
      </div>
    </form>
  );
}

export function ChoiceExercise({
  exercise,
  done,
  onResult,
}: SubProps<Extract<Exercise, { type: "multiple_choice" }>>) {
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (opt: string) => {
    if (done) return;
    setPicked(opt);
    onResult(normalizeAnswer(opt) === normalizeAnswer(exercise.answer), opt);
  };
  return (
    <div className="space-y-3">
      <p className="text-lg leading-relaxed">{exercise.prompt}</p>
      <div className="grid gap-2">
        {exercise.options.map((opt) => {
          const isAnswer =
            normalizeAnswer(opt) === normalizeAnswer(exercise.answer);
          const isPicked = picked === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={done}
              onClick={() => choose(opt)}
              className={cn(
                "rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-default",
                done && isAnswer && "border-success/50 bg-success/10",
                done && isPicked && !isAnswer && "border-destructive/50 bg-destructive/10",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SentenceBuildExercise({
  exercise,
  done,
  onResult,
}: SubProps<Extract<Exercise, { type: "sentence_build" }>>) {
  const tokens = useMemo(() => exercise.answer.split(/\s+/), [exercise.answer]);
  const shuffled = useMemo(
    () => seededShuffle(tokens, exercise.id),
    [tokens, exercise.id],
  );
  const [picked, setPicked] = useState<number[]>([]);
  const pickedSet = new Set(picked);
  const built = picked.map((i) => shuffled[i]).join(" ");

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{exercise.prompt}</p>
      <div className="min-h-11 rounded-xl border border-dashed border-border p-2.5 text-lg">
        {built || <span className="text-muted-foreground">Tap words…</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {shuffled.map((tok, i) => (
          <button
            key={i}
            type="button"
            disabled={done || pickedSet.has(i)}
            onClick={() => setPicked((p) => [...p, i])}
            className={cn(
              "rounded-lg border border-border bg-card px-3 py-1.5 transition-colors hover:bg-muted",
              pickedSet.has(i) && "opacity-30",
            )}
          >
            {tok}
          </button>
        ))}
      </div>
      {!done && (
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => onResult(isCorrect(built, exercise.answer), built)}
          >
            Check
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPicked([])}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
