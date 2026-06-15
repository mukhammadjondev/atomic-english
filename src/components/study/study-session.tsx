"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PartyPopper, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { celebrate } from "@/lib/celebrate";
import { useKeyboardGrading } from "@/hooks/use-keyboard-grading";
import { useStudySession } from "@/lib/study/session-store";
import type { StudyCard } from "@/lib/study/types";
import { CardRenderer } from "./card-renderer";
import { MeetCard } from "./meet-card";
import { RevealPanel } from "./reveal-panel";
import { GradeButtons } from "./grade-buttons";

export function StudySession({ cards }: { cards: StudyCard[] }) {
  const s = useStudySession();

  useEffect(() => {
    s.start(cards);
    return () => s.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  useKeyboardGrading({
    enabled: s.status === "active" && s.phase === "drill",
    revealed: s.revealed,
    onGrade: s.grade,
    onReveal: s.revealSelf,
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

  const card = s.current();
  if (!card) return null;
  const total = s.queue.length;
  const position = Math.min(s.index + 1, total);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {s.phase === "meet" ? "Learn" : card.isNew ? "New" : "Review"} ·{" "}
            {position}/{total}
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
          key={`${card.cardId}-${s.phase}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        >
          {s.phase === "meet" ? (
            <MeetCard card={card} onContinue={s.beginDrill} />
          ) : (
            <>
              <CardRenderer
                card={card}
                revealed={s.revealed}
                onSubmitTyped={s.submitTyped}
                onReveal={s.revealSelf}
              />

              {s.revealed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <RevealPanel
                card={card}
                status={s.lastStatus}
                typed={s.lastInput}
              />
                  <GradeButtons
                    onGrade={s.grade}
                    suggested={s.suggestedRating}
                  />
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
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
        {allCaughtUp ? (
          <Sparkles className="size-8" />
        ) : (
          <PartyPopper className="size-8" />
        )}
      </div>
      <h2 className="font-display text-3xl font-semibold">
        {allCaughtUp ? "All caught up" : "Session complete"}
      </h2>
      <p className="max-w-sm text-muted-foreground">
        {allCaughtUp
          ? "Nothing due right now. Come back later, or add a new block to keep going."
          : `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"} — ${correct} correct on the first try. Nice work.`}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>
          Back to dashboard
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
