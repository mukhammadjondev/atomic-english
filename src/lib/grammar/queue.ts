import { State } from "ts-fsrs";
import { CEFR } from "@/lib/content/schema";
import type { StoredCardState } from "@/lib/store/types";
import { isDue } from "@/lib/srs/scheduler";
import { dayKey } from "@/lib/date";
import { seededShuffle } from "@/lib/shuffle";
import type { GrammarCard, GrammarQueueItem } from "./study-types";

export interface BuildGrammarQueueArgs {
  cards: GrammarCard[];
  states: Map<string, StoredCardState>;
  reviewCap: number;
  /** new grammar exercises to introduce today */
  grammarPerDay: number;
  /** tags that bump an item to the front (e.g. "weak-spot") */
  weakSpotTags?: string[];
  now?: Date;
}

export interface GrammarQueueSummary {
  items: GrammarQueueItem[];
  dueCount: number;
  newCount: number;
}

/** A1 < A2 < B1 < B2 < C1 < C2; a topic with no CEFR is treated as mid (B1). */
const CEFR_RANK: Record<string, number> = Object.fromEntries(
  CEFR.map((c, i) => [c, i]),
);
const DEFAULT_BAND = "B1";
const bandRank = (c?: string) => CEFR_RANK[c ?? DEFAULT_BAND] ?? CEFR_RANK[DEFAULT_BAND];

/**
 * Exercise-type order within the interleave: recognition first (multiple choice),
 * production last (build the sentence). The harder, generative exercises land in
 * the later rounds — same spaced-retrieval logic as the vocab queue's MODE_RANK.
 */
const TYPE_RANK: Record<string, number> = {
  multiple_choice: 0,
  fill_blank: 1,
  error_correction: 2,
  sentence_build: 3,
};
const typeRank = (t: string) => TYPE_RANK[t] ?? 9;

/** Share of a band's cards that must reach State.Review before the next unlocks. */
const LADDER_THRESHOLD = 0.6;

/**
 * Build a grammar practice session:
 *   1. due reviews first (capped) — lapsed/weak items lead so mistakes resurface fast.
 *   2. new exercises drawn lowest-CEFR-first behind an adaptive ladder (a band
 *      unlocks only once the band below is mostly mastered or exhausted), capped
 *      by `grammarPerDay`, then interleaved by type in day-seeded rounds.
 */
export function buildGrammarQueue({
  cards,
  states,
  reviewCap,
  grammarPerDay,
  weakSpotTags = [],
  now = new Date(),
}: BuildGrammarQueueArgs): GrammarQueueSummary {
  const weak = new Set(weakSpotTags);
  const isWeak = (c: GrammarCard) => (c.tags ?? []).some((t) => weak.has(t));

  // --- partition + per-band mastery (for the ladder) -----------------------
  const due: { card: GrammarCard; due: number; priority: number }[] = [];
  const fresh: { card: GrammarCard; index: number }[] = [];
  const bandTotal = new Map<number, number>();
  const bandMastered = new Map<number, number>();
  const bandFresh = new Map<number, number>();

  cards.forEach((card, index) => {
    const band = bandRank(card.cefr);
    bandTotal.set(band, (bandTotal.get(band) ?? 0) + 1);

    const state = states.get(card.cardId);
    if (state?.introduced) {
      if (state.fsrs.state === State.Review) {
        bandMastered.set(band, (bandMastered.get(band) ?? 0) + 1);
      }
      if (isDue(state.fsrs, now)) {
        const lapsed = state.fsrs.lapses > 0;
        due.push({
          card,
          due: new Date(state.fsrs.due).getTime(),
          priority: lapsed || isWeak(card) ? 1 : 0,
        });
      }
    } else {
      fresh.push({ card, index });
      bandFresh.set(band, (bandFresh.get(band) ?? 0) + 1);
    }
  });

  // a band is "cleared" (won't block higher bands) when mostly mastered OR has
  // no fresh cards left to learn; unlock cascades up from the lowest band.
  const bands = [...bandTotal.keys()].sort((a, b) => a - b);
  const cleared = (band: number) => {
    const total = bandTotal.get(band) ?? 0;
    const mastered = bandMastered.get(band) ?? 0;
    const freshLeft = bandFresh.get(band) ?? 0;
    return freshLeft === 0 || (total > 0 && mastered / total >= LADDER_THRESHOLD);
  };
  const unlocked = new Set<number>();
  let gate = true;
  for (const band of bands) {
    if (gate) unlocked.add(band);
    gate = gate && cleared(band);
  }

  // --- due reviews: priority (lapsed/weak) first, then soonest-due ----------
  due.sort((a, b) => b.priority - a.priority || a.due - b.due);
  const reviewItems: GrammarQueueItem[] = due
    .slice(0, reviewCap)
    .map(({ card }) => ({ ...card, isNew: false }));

  // --- new exercises: lowest band first, weak ahead, capped ----------------
  const selected = fresh
    .filter(({ card }) => unlocked.has(bandRank(card.cefr)))
    .sort(
      (a, b) =>
        bandRank(a.card.cefr) - bandRank(b.card.cefr) ||
        Number(isWeak(b.card)) - Number(isWeak(a.card)) ||
        a.index - b.index,
    )
    .slice(0, Math.max(0, grammarPerDay))
    .map(({ card }) => card);

  // group selected by topic (selection order), sort each topic by type rank,
  // then round-robin across topics and shuffle each round per day.
  const byTopic = new Map<string, GrammarCard[]>();
  for (const card of selected) {
    const arr = byTopic.get(card.topicId);
    if (arr) arr.push(card);
    else byTopic.set(card.topicId, [card]);
  }
  const topicCards = [...byTopic.values()].map((cs) =>
    [...cs].sort((a, b) => typeRank(a.type) - typeRank(b.type)),
  );

  const seed = dayKey(now);
  const maxRounds = topicCards.reduce((m, cs) => Math.max(m, cs.length), 0);
  const newItems: GrammarQueueItem[] = [];
  for (let r = 0; r < maxRounds; r++) {
    const round = topicCards
      .map((cs) => cs[r])
      .filter((c): c is GrammarCard => Boolean(c))
      .map((card) => ({ ...card, isNew: true }));
    newItems.push(...seededShuffle(round, `${seed}:g:${r}`));
  }

  return {
    items: [...reviewItems, ...newItems],
    dueCount: reviewItems.length,
    newCount: newItems.length,
  };
}
