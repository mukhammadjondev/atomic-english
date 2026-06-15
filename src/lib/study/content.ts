import type { CardEntry } from "@/lib/content/loader";
import type { StudyCard } from "./types";

/** Map loaded card entries into flat, serializable study cards (preserves order). */
export function studyCardsFrom(entries: CardEntry[]): StudyCard[] {
  return entries.map(({ card, vocab }) => ({
    cardId: card.id,
    vocabId: vocab.id,
    mode: card.mode,
    prompt: card.prompt,
    answer: card.answer,
    accepted: card.accepted,
    hint: card.hint,
    word: vocab.word,
    pos: vocab.pos,
    tags: vocab.tags,
    ipa: vocab.ipa,
    meaningUz: vocab.meaningUz,
    meaningEn: vocab.meaningEn,
    audioUrl: vocab.audioUrl,
    example: vocab.examples?.[0]
      ? {
          en: vocab.examples[0].en,
          uz: vocab.examples[0].uz,
          audioUrl: vocab.examples[0].audioUrl,
        }
      : undefined,
  }));
}
