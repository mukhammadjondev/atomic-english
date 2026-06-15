import { State } from "ts-fsrs";
import type { StoredCardState, StoredReviewLog } from "@/lib/store/types";
import { addDays, dayKey } from "@/lib/date";

export interface ProgressStats {
  /** distinct vocab words that have been introduced */
  wordsLearned: number;
  /** cards whose FSRS state has reached Review (mastered-ish) */
  cardsMastered: number;
  cardsInProgress: number;
  /** share of reviews graded Good/Easy (0..1), or null if no reviews yet */
  accuracy: number | null;
  totalReviews: number;
}

const GOOD = 3; // Rating.Good

export function computeStats(
  states: StoredCardState[],
  logs: StoredReviewLog[],
): ProgressStats {
  const words = new Set(states.map((s) => s.vocabId));
  const mastered = states.filter((s) => s.fsrs.state === State.Review).length;

  const graded = logs.filter((l) => l.log.rating >= 1);
  const good = graded.filter((l) => l.log.rating >= GOOD).length;

  return {
    wordsLearned: words.size,
    cardsMastered: mastered,
    cardsInProgress: states.length - mastered,
    accuracy: graded.length ? good / graded.length : null,
    totalReviews: graded.length,
  };
}

/**
 * Grammar topics fully mastered — every introduced exercise of the topic has
 * reached FSRS State.Review. `grammarStates` should already be filtered to
 * `kind === "grammar"` (their `vocabId` is the topic id).
 */
export function topicsMastered(grammarStates: StoredCardState[]): number {
  const byTopic = new Map<string, { total: number; mastered: number }>();
  for (const s of grammarStates) {
    const t = byTopic.get(s.vocabId) ?? { total: 0, mastered: 0 };
    t.total++;
    if (s.fsrs.state === State.Review) t.mastered++;
    byTopic.set(s.vocabId, t);
  }
  let n = 0;
  for (const { total, mastered } of byTopic.values()) {
    if (total > 0 && mastered === total) n++;
  }
  return n;
}

/** A value plotted against a calendar day. */
export interface DayPoint {
  date: string;
  value: number;
}

/** Build an ordered list of the last `days` day-keys, ending today. */
function recentDays(days: number, today: string): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, -(days - 1 - i)));
}

/**
 * First-try accuracy per day over the window (share graded Good/Easy of the
 * reviews done that day). Days with no reviews report 0 — the chart distinguishes
 * them by the companion `reviewsByDay` count if needed.
 */
export function accuracyByDay(
  logs: StoredReviewLog[],
  days = 14,
  today: string = dayKey(),
): DayPoint[] {
  const total = new Map<string, number>();
  const good = new Map<string, number>();
  for (const l of logs) {
    if (l.log.rating < 1) continue;
    const d = dayKey(new Date(l.reviewedAt));
    total.set(d, (total.get(d) ?? 0) + 1);
    if (l.log.rating >= GOOD) good.set(d, (good.get(d) ?? 0) + 1);
  }
  return recentDays(days, today).map((date) => {
    const t = total.get(date) ?? 0;
    return { date, value: t ? (good.get(date) ?? 0) / t : 0 };
  });
}

/**
 * Cumulative distinct words learned through each day of the window. A word counts
 * from the day its first card was first reviewed.
 */
export function wordsLearnedByDay(
  states: StoredCardState[],
  logs: StoredReviewLog[],
  days = 14,
  today: string = dayKey(),
): DayPoint[] {
  const vocabOf = new Map(states.map((s) => [s.cardId, s.vocabId]));
  const firstDay = new Map<string, string>(); // vocabId -> earliest day
  for (const l of logs) {
    const vocab = vocabOf.get(l.cardId);
    if (!vocab) continue;
    const d = dayKey(new Date(l.reviewedAt));
    const prev = firstDay.get(vocab);
    if (!prev || d < prev) firstDay.set(vocab, d);
  }
  const firsts = [...firstDay.values()];
  return recentDays(days, today).map((date) => ({
    date,
    value: firsts.filter((d) => d <= date).length,
  }));
}
