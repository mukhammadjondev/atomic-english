import type { Block } from "@/lib/content/schema";
import { grammarTopics } from "./content";
import type { GrammarCard } from "./study-types";

/** Flatten every grammar topic's exercises into SRS cards (one card per exercise). */
export function grammarCardsFrom(blocks: Block[]): GrammarCard[] {
  return grammarTopics(blocks).flatMap((g) =>
    g.exercises.map((ex) => ({
      cardId: ex.id,
      topicId: g.id,
      topic: g.topic,
      type: ex.type,
      prompt: ex.prompt,
      answer: ex.answer,
      accepted: ex.type === "fill_blank" ? ex.accepted : undefined,
      options: ex.type === "multiple_choice" ? ex.options : undefined,
      explanationMd: ex.explanationMd,
      cefr: g.cefr,
      tags: g.tags,
    })),
  );
}
