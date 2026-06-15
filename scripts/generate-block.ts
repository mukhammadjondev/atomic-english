/**
 * AI content-block generator. Feed a word list; Claude drafts a content block
 * that conforms to our Zod schema; we validate it and write it for human review.
 *
 *   ANTHROPIC_API_KEY=sk-... pnpm content:generate words.txt --theme "Travel"
 *
 * `words.txt` = one word or phrase per line (lines starting with # are ignored).
 * The block is NEVER trusted blindly — it must pass blockSchema before we write,
 * and you should read it before committing.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { blockSchema, type Block } from "../src/lib/content/schema";
import { formatBlockError } from "../src/lib/content/format-error";

const MODEL = "claude-sonnet-4-6";
const BLOCKS_DIR = path.join(process.cwd(), "content", "blocks");

function fail(msg: string): never {
  console.error("✗ " + msg);
  process.exit(1);
}

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function nextBlockNumber(): Promise<number> {
  let files: string[] = [];
  try {
    files = await readdir(BLOCKS_DIR);
  } catch {
    /* dir may not exist yet */
  }
  const nums = files
    .map((f) => /^block-(\d+)\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function systemPrompt(blockId: string, prefix: string, order: number, theme: string) {
  return `You are a content author for "Atomic English", a vocabulary app for Uzbek speakers (B1–B2).
Produce ONE content block as STRICT JSON matching this shape — output JSON only, no prose, no markdown fences:

{
  "schemaVersion": "1",
  "blockId": "${blockId}",
  "order": ${order},
  "days": [${order}],
  "theme": "${theme}",
  "cefr": "B1" | "B2",
  "tags": ["lowercase-hyphen", ...],
  "vocabulary": [
    {
      "id": "${prefix}-<slug>",            // lowercase letters/digits/hyphens, globally unique
      "type": "vocab",
      "word": "<english word/phrase>",
      "pos": "noun"|"verb"|"adjective"|"adverb"|"phrase"|"preposition"|"conjunction"|"idiom",
      "ipa": "<IPA, optional>",
      "meaningUz": "<Uzbek meaning>",
      "meaningEn": "<short English definition>",
      "tags": ["..."],
      "cards": [
        { "id": "${prefix}-<slug>-c1", "mode": "cloze", "prompt": "<a real sentence with the target word replaced by ___>", "answer": "<word>", "accepted": ["<variant>"] },
        { "id": "${prefix}-<slug>-c2", "mode": "production", "prompt": "<the Uzbek meaning as the cue>", "answer": "<word>" },
        { "id": "${prefix}-<slug>-c3", "mode": "listening", "prompt": "<word>", "answer": "<word>" }
      ],
      "examples": [ { "en": "<example sentence>", "uz": "<Uzbek translation>" } ]
    }
  ],
  "grammar": [],
  "speaking": [
    { "id": "${prefix}-sp1", "type": "speaking", "promptEn": "<a speaking task>", "promptUz": "<Uzbek translation>" }
  ]
}

Rules:
- Every id is unique and starts with "${prefix}-".
- cloze prompts MUST contain "___" where the word goes, in a natural sentence.
- Keep meanings accurate; keep examples natural and not too long.
- Use exactly the cards shown (cloze, production, listening) per word.`;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) fail("ANTHROPIC_API_KEY is not set. Export it and re-run.");

  const listPath = process.argv[2];
  if (!listPath || listPath.startsWith("--")) {
    fail('Usage: pnpm content:generate <words.txt> [--theme "Theme"]');
  }

  let raw: string;
  try {
    raw = await readFile(listPath, "utf8");
  } catch {
    fail(`Could not read word list at "${listPath}".`);
  }
  const words = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (!words.length) fail("Word list is empty.");

  const num = await nextBlockNumber();
  const blockId = `block-${String(num).padStart(3, "0")}`;
  const prefix = `b${String(num).padStart(3, "0")}`;
  const theme = arg("--theme") ?? "General vocabulary";

  console.log(`Generating ${blockId} (${words.length} words, theme: ${theme})…`);

  const client = new Anthropic({ apiKey });
  const system = systemPrompt(blockId, prefix, num, theme);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Words:\n${words.join("\n")}` },
  ];

  // up to 2 attempts: if validation fails, feed the errors back for a fix.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages,
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      if (attempt === 2) fail(`Model did not return valid JSON: ${(e as Error).message}`);
      messages.push({ role: "assistant", content: text });
      messages.push({ role: "user", content: "That wasn't valid JSON. Return only the JSON object." });
      continue;
    }

    const parsed = blockSchema.safeParse(json);
    if (parsed.success) {
      await writeOut(blockId, parsed.data);
      return;
    }

    const errors = formatBlockError(`${blockId}.json`, parsed.error);
    if (attempt === 2) fail(`Generated block failed validation:\n${errors}`);
    console.log("⚠ validation failed, asking the model to fix…");
    messages.push({ role: "assistant", content: text });
    messages.push({
      role: "user",
      content: `The JSON failed schema validation:\n${errors}\nReturn the corrected full JSON only.`,
    });
  }
}

async function writeOut(blockId: string, block: Block) {
  const file = path.join(BLOCKS_DIR, `${blockId}.json`);
  await writeFile(file, JSON.stringify(block, null, 2) + "\n", "utf8");
  console.log(`✓ Wrote ${file}`);
  console.log("  Review it, then run: pnpm validate:content");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
