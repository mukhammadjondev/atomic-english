import type { Cefr, ExerciseType } from "@/lib/content/schema";

/**
 * Flattened, serializable view of one grammar exercise as an SRS card. One
 * exercise = one FSRS item (its `id` is globally unique). Built on the server
 * (`grammarCardsFrom`) and handed to the client practice session.
 */
export interface GrammarCard {
  /** exercise id — the FSRS card id */
  cardId: string;
  /** owning grammar topic id, for grouping + mastery */
  topicId: string;
  topic: string;
  type: ExerciseType;
  prompt: string;
  answer: string;
  /** fill_blank accepted variants */
  accepted?: string[];
  /** multiple_choice options */
  options?: string[];
  explanationMd?: string;
  /** topic CEFR — drives the lower-difficulty-first ladder */
  cefr?: Cefr;
  /** topic tags (e.g. "weak-spot") — bump an item to the front */
  tags?: string[];
}

export interface GrammarQueueItem extends GrammarCard {
  isNew: boolean;
}
