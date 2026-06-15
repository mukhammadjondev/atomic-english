/**
 * Standalone content validator — `pnpm validate:content`.
 * Loads every block, reports a summary, and demonstrates a located error.
 */
import { loadBlocks } from "../src/lib/content/loader";
import { blockSchema } from "../src/lib/content/schema";
import { formatBlockError, ContentError } from "../src/lib/content/format-error";

async function main() {
  try {
    const { blocks, cards, vocabById } = await loadBlocks();
    console.log(`✓ Loaded ${blocks.length} block(s):`);
    for (const b of blocks) {
      console.log(
        `  ${b.blockId} — "${b.theme}" · ${b.vocabulary.length} vocab, ${b.grammar.length} grammar, ${b.speaking.length} speaking`,
      );
    }
    console.log(`✓ ${vocabById.size} vocab items, ${cards.length} cards total`);
  } catch (e) {
    if (e instanceof ContentError) {
      console.error("✗ Content failed to load:\n" + e.message);
      process.exit(1);
    }
    throw e;
  }

  // sanity: confirm a deliberately broken block yields a located message
  const broken = blockSchema.safeParse({
    schemaVersion: "1.0",
    blockId: "block-bad",
    order: 1,
    days: [1],
    theme: "Broken",
    vocabulary: [
      {
        id: "v-bad",
        type: "vocab",
        word: "x",
        pos: "verb",
        meaningUz: "x",
        meaningEn: "x",
        cards: [{ id: "v-bad-c1", mode: "cloze", prompt: "x" }],
      },
    ],
  });
  if (!broken.success) {
    console.log("\n✓ Error formatting demo (intentional):");
    console.log(formatBlockError("block-bad.json", broken.error));
  } else {
    console.error("✗ Expected the broken block to fail validation");
    process.exit(1);
  }
}

main();
