import type { StoredCardState } from "@/lib/store/types";
import { isDue } from "@/lib/srs/scheduler";
import { dayKey } from "@/lib/date";
import { seededShuffle } from "@/lib/shuffle";
import type { QueueItem, StudyCard } from "./types";

export interface BuildQueueArgs {
  cards: StudyCard[];
  states: Map<string, StoredCardState>;
  reviewCap: number;
  /** number of NEW WORDS to introduce today (all of a word's cards come with it) */
  newCardsPerDay: number;
  /** content tags that bump a word to the front of the new-word selection */
  weakSpotTags?: string[];
  now?: Date;
}

export interface QueueSummary {
  queue: QueueItem[];
  dueCount: number;
  newCount: number;
}

/**
 * Card-mode order within a single new word: gentle word-level recall first,
 * sentence-application (cloze / build) last. This makes the "use it in a
 * sentence" cards land in the later interleaving rounds.
 */
const MODE_RANK: Record<string, number> = {
  recall_meaning: 0,
  production: 1,
  listening: 2,
  cloze: 3,
  sentence_order: 4,
};

const rank = (mode: string) => MODE_RANK[mode] ?? 9;

/**
 * Build today's session:
 *   1. due reviews first (capped) — clear the backlog before new material.
 *   2. new words (capped by WORD), their cards interleaved in rounds.
 *
 * Interleaving (round-robin across words, shuffled per day) is deliberate: a
 * word's cloze/production/listening cards never run back-to-back, and the
 * sentence cards return in a mixed order later in the session — spaced,
 * interleaved retrieval beats blocked drilling for retention.
 */
export function buildQueue({
  cards,
  states,
  reviewCap,
  newCardsPerDay,
  weakSpotTags = [],
  now = new Date(),
}: BuildQueueArgs): QueueSummary {
  const due: { card: StudyCard; due: number }[] = [];
  // group not-yet-introduced cards by word, preserving author order of words
  const freshByWord = new Map<string, StudyCard[]>();

  for (const card of cards) {
    const state = states.get(card.cardId);
    if (state?.introduced) {
      if (isDue(state.fsrs, now)) {
        due.push({ card, due: new Date(state.fsrs.due).getTime() });
      }
    } else {
      const arr = freshByWord.get(card.vocabId);
      if (arr) arr.push(card);
      else freshByWord.set(card.vocabId, [card]);
    }
  }

  due.sort((a, b) => a.due - b.due);
  const reviewItems: QueueItem[] = due
    .slice(0, reviewCap)
    .map(({ card }) => ({ ...card, isNew: false }));

  // order new words so tagged weak-spots come first (author order within a group,
  // relying on stable sort), then take the first N — weaknesses make the cut.
  const weak = new Set(weakSpotTags);
  const isWeak = (cs: StudyCard[]) => (cs[0]?.tags ?? []).some((t) => weak.has(t));
  const wordCards = [...freshByWord.values()]
    .sort((a, b) => Number(isWeak(b)) - Number(isWeak(a)))
    .slice(0, Math.max(0, newCardsPerDay))
    .map((cs) => [...cs].sort((a, b) => rank(a.mode) - rank(b.mode)));

  // round r = the r-th card of every selected word, then shuffle the word order
  const seed = dayKey(now);
  const maxRounds = wordCards.reduce((m, cs) => Math.max(m, cs.length), 0);
  const newItems: QueueItem[] = [];
  for (let r = 0; r < maxRounds; r++) {
    const round = wordCards
      .map((cs) => cs[r])
      .filter((c): c is StudyCard => Boolean(c))
      .map((card) => ({ ...card, isNew: true }));
    newItems.push(...seededShuffle(round, `${seed}:${r}`));
  }

  return {
    queue: [...reviewItems, ...newItems],
    dueCount: reviewItems.length,
    newCount: newItems.length,
  };
}
