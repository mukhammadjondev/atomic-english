import type { Block, Grammar } from "@/lib/content/schema";

/** Flatten grammar topics across all blocks, preserving block order. */
export function grammarTopics(blocks: Block[]): Grammar[] {
  return blocks.flatMap((b) => b.grammar);
}

export function findGrammarTopic(
  blocks: Block[],
  id: string,
): Grammar | undefined {
  return grammarTopics(blocks).find((g) => g.id === id);
}
