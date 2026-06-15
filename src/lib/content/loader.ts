import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { blockSchema, type Block, type Card, type Vocab } from "./schema";
import { ContentError, formatBlockError } from "./format-error";

/**
 * Server-only content loader. Reads every `content/blocks/*.json`, validates it
 * against the Zod schema, enforces globally-unique ids, and returns typed,
 * ordered content plus flat lookup indexes.
 *
 * Fails loudly: a malformed block aborts the load with a precise, located
 * message rather than silently dropping content.
 */

export const BLOCKS_DIR = path.join(process.cwd(), "content", "blocks");

export interface CardEntry {
  card: Card;
  vocab: Vocab;
  blockId: string;
}

export interface LoadedContent {
  blocks: Block[];
  /** every active-recall card across all blocks, flattened */
  cards: CardEntry[];
  cardById: Map<string, CardEntry>;
  vocabById: Map<string, Vocab>;
}

async function readBlockFiles(): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(BLOCKS_DIR);
  } catch {
    throw new ContentError(
      `No content directory found at ${BLOCKS_DIR}. Add block-001.json to get started.`,
    );
  }
  return entries
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
}

function parseBlock(file: string, raw: string): Block {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new ContentError(
      `Invalid content block "${file}": not valid JSON — ${(e as Error).message}`,
    );
  }
  const result = blockSchema.safeParse(json);
  if (!result.success) {
    throw new ContentError(formatBlockError(file, result.error));
  }
  return result.data;
}

/** Reject reused ids — ids must be stable and globally unique, never recycled. */
function assertUniqueIds(blocks: Block[]): void {
  const seen = new Map<string, string>(); // id -> first file that used it
  const clashes: string[] = [];

  const claim = (id: string, where: string) => {
    const prev = seen.get(id);
    if (prev) clashes.push(`  duplicate id "${id}" (in ${prev} and ${where})`);
    else seen.set(id, where);
  };

  for (const block of blocks) {
    claim(block.blockId, block.blockId);
    for (const v of block.vocabulary) {
      claim(v.id, block.blockId);
      for (const c of v.cards) claim(c.id, block.blockId);
    }
    for (const g of block.grammar) {
      claim(g.id, block.blockId);
      for (const ex of g.exercises) claim(ex.id, block.blockId);
    }
    for (const s of block.speaking) claim(s.id, block.blockId);
  }

  if (clashes.length) {
    throw new ContentError(["Duplicate ids found:", ...clashes].join("\n"));
  }
}

export async function loadBlocks(): Promise<LoadedContent> {
  const files = await readBlockFiles();
  if (files.length === 0) {
    throw new ContentError(
      `No content blocks in ${BLOCKS_DIR}. Add block-001.json to get started.`,
    );
  }

  const blocks: Block[] = [];
  for (const file of files) {
    const raw = await readFile(path.join(BLOCKS_DIR, file), "utf8");
    blocks.push(parseBlock(file, raw));
  }

  assertUniqueIds(blocks);
  blocks.sort((a, b) => a.order - b.order);

  const cards: CardEntry[] = [];
  const cardById = new Map<string, CardEntry>();
  const vocabById = new Map<string, Vocab>();

  for (const block of blocks) {
    for (const vocab of block.vocabulary) {
      vocabById.set(vocab.id, vocab);
      for (const card of vocab.cards) {
        const entry: CardEntry = { card, vocab, blockId: block.blockId };
        cards.push(entry);
        cardById.set(card.id, entry);
      }
    }
  }

  return { blocks, cards, cardById, vocabById };
}
