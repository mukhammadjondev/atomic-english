# Phase 01 — Content layer

**Goal:** Authored JSON blocks load, validate loudly, and expose typed content.

## Steps
1. `lib/content/schema.ts` — Zod schemas mirroring `PROMPT.md` §2.2:
   - `blockSchema` with `schemaVersion`, `blockId`, `order`, `days`, `theme`, `cefr`, `tags`.
   - `vocabSchema` (`cards[]` discriminated by `mode`: cloze/recall_meaning/listening/production/sentence_order), `examples[]`.
   - `grammarSchema` (`exercises[]` discriminated by `type`: fill_blank/error_correction/multiple_choice/sentence_build, `explanationMd`).
   - `speakingSchema`. Optional future fields kept optional (audioUrl, tags, difficulty, relatedIds).
   - Export inferred types via `z.infer`.
2. `lib/content/loader.ts` — read all `content/blocks/*.json` (server-side `fs` / glob), validate each, **fail loudly** with precise path: `block-002.json: vocabulary[3].cards[0] missing 'answer'` (format Zod `error.issues`). Return sorted-by-`order` typed blocks + a flat card index.
3. `content/blocks/block-001.json` — author from §12: ~8 vocab (establish, consistency, gradually, stick to, effortless, set aside, setback, keep track of) each with cloze+production+listening cards + example; Third Conditional grammar with all 4 exercise types; 2 speaking prompts.

## Files
`lib/content/schema.ts`, `lib/content/loader.ts`, `lib/content/format-error.ts`, `content/blocks/block-001.json`.

## Done when
- Valid block parses to typed objects; IDs unique.
- Corrupting a field yields a clear, located error message.
