import type { CardMode, Pos } from "@/lib/content/schema";

/**
 * Flattened, serializable view of one active-recall card with the vocab context
 * a renderer needs. Built on the server (`studyCardsFrom`) and passed to the
 * client session — no Dates, safe to serialize.
 */
export interface StudyCard {
  cardId: string;
  vocabId: string;
  mode: CardMode;
  prompt: string;
  answer: string;
  accepted?: string[];
  hint?: string;

  word: string;
  pos: Pos;
  /** author tags (e.g. "weak-spot", "conditionals") — drive review priority */
  tags?: string[];
  ipa?: string;
  meaningUz: string;
  meaningEn: string;
  /** pre-generated MP3 for the word (layer-2 TTS), if any */
  audioUrl?: string | null;
  example?: { en: string; uz: string; audioUrl?: string | null };
}

export interface QueueItem extends StudyCard {
  isNew: boolean;
}
