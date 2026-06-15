"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { MarkdownProse } from "@/components/shared/markdown-prose";
import { recordGrammarAttempt } from "@/lib/grammar/record";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/content/schema";
import {
  ChoiceExercise,
  SentenceBuildExercise,
  TYPE_LABEL,
  TypedExercise,
} from "./exercise-inputs";

export function ExerciseCard({
  exercise,
  index,
  topicId,
}: {
  exercise: Exercise;
  index: number;
  /** when set, a first attempt is recorded to the SRS schedule */
  topicId?: string;
}) {
  const [done, setDone] = useState(false);
  const [correct, setCorrect] = useState(false);

  const onResult = (ok: boolean) => {
    setCorrect(ok);
    setDone(true);
    if (topicId) void recordGrammarAttempt(exercise.id, topicId, ok);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {index}. {TYPE_LABEL[exercise.type]}
        </span>
        {done && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium",
              correct ? "text-success" : "text-destructive",
            )}
          >
            {correct ? <Check className="size-4" /> : <X className="size-4" />}
            {correct ? "Correct" : "Review"}
          </span>
        )}
      </div>

      {exercise.type === "multiple_choice" ? (
        <ChoiceExercise exercise={exercise} done={done} onResult={onResult} />
      ) : exercise.type === "sentence_build" ? (
        <SentenceBuildExercise exercise={exercise} done={done} onResult={onResult} />
      ) : (
        <TypedExercise exercise={exercise} done={done} onResult={onResult} />
      )}

      {done && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          {!correct && (
            <p className="text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="font-medium">{exercise.answer}</span>
            </p>
          )}
          {exercise.explanationMd && (
            <div className="text-sm">
              <MarkdownProse markdown={exercise.explanationMd} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
