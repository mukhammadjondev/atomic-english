import type { Block, Speaking } from "@/lib/content/schema";

/** Flat list of speaking prompts across all blocks. */
export function speakingPrompts(blocks: Block[]): Speaking[] {
  return blocks.flatMap((b) => b.speaking);
}
