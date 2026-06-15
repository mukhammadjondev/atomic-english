import { getRepository } from "@/lib/store";
import { autoGrade } from "@/lib/srs/grade";
import { emptyCard, makeScheduler, reviewCard } from "@/lib/srs/scheduler";
import { recordCardCompleted } from "@/lib/habits/streak";

/**
 * Record a single grammar attempt from anywhere outside the practice session
 * (e.g. the topic page). Advances the exercise's FSRS state so doing a topic
 * page counts as "covering" it and feeds the spaced-review schedule. Auto-grades
 * Good/Again from correctness — the session offers finer 4-button control.
 */
export async function recordGrammarAttempt(
  exerciseId: string,
  topicId: string,
  correct: boolean,
): Promise<void> {
  const repo = getRepository();
  const settings = await repo.getSettings();
  const now = new Date();
  const prev = await repo.getCardState(exerciseId);
  const scheduler = makeScheduler(settings.retention);
  const fsrsCard = prev?.fsrs ?? emptyCard(now);
  const { card: nextFsrs, log } = reviewCard(
    scheduler,
    fsrsCard,
    autoGrade(correct),
    now,
  );
  await repo.putCardState({
    cardId: exerciseId,
    vocabId: topicId,
    kind: "grammar",
    fsrs: nextFsrs,
    introduced: true,
  });
  await repo.appendReviewLog({
    cardId: exerciseId,
    log,
    reviewedAt: now.toISOString(),
  });
  await recordCardCompleted(repo, settings, now);
}
