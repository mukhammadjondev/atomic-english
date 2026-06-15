import type { Block, Pos } from "@/lib/content/schema";

export interface VocabSummary {
  id: string;
  word: string;
  pos: Pos;
  ipa?: string;
  meaningEn: string;
  meaningUz: string;
  audioUrl?: string | null;
  cardIds: string[];
  tags?: string[];
}

/** Flat, serializable list of every vocab item for the library / search view. */
export function vocabList(blocks: Block[]): VocabSummary[] {
  return blocks.flatMap((b) =>
    b.vocabulary.map((v) => ({
      id: v.id,
      word: v.word,
      pos: v.pos,
      ipa: v.ipa,
      meaningEn: v.meaningEn,
      meaningUz: v.meaningUz,
      audioUrl: v.audioUrl,
      cardIds: v.cards.map((c) => c.id),
      tags: v.tags,
    })),
  );
}
