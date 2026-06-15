# Atomic English

A personalized English-learning habit, built on *Atomic Habits* + science-backed
memory methods: **active recall**, **spaced repetition (FSRS)**, **cloze
deletion**, and **sentence-based learning**. Calm during study, rewarding at the
streak. Works fully offline on local storage — no database or API key required.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind v4** + **shadcn/ui** (Base UI) — custom *Warm Focus* design system
- **ts-fsrs** — modern FSRS spaced-repetition scheduling
- **Zod** — content validation · **idb** — IndexedDB local store
- **framer-motion** + **canvas-confetti** — celebration moments
- **Prisma** + **Neon** (optional DB) · **edge-tts** (optional audio) ·
  **Anthropic API** (optional speaking / writing / reading + content generation)
- **Installable PWA** — offline app shell + add-to-home-screen

## Features

- **Study loop** — FSRS scheduling, meet-then-drill for new words, interleaved
  daily queue, typo-tolerant grading, undo a mis-grade, keyboard shortcuts.
- **Weak-spot priority** — words you tag (e.g. `weak-spot`) surface first.
- **Habit layer** — streak chain, don't-break-the-chain calendar, daily goal,
  confetti, identity affirmations, **rest-day tokens** (1 per 7 days) that bridge
  the chain, and an optional **daily reminder**.
- **Grammar practice** — `/grammar/practice`: every grammar exercise is its own
  FSRS card, resurfaced spaced and **lowest-CEFR-first** behind an adaptive
  difficulty ladder; exercise types are interleaved and shuffled per day, and
  items you miss come back sooner. Doing a topic page also feeds the schedule.
- **Progress** — `/progress`: accuracy trend, words-learned curve, a 14-day
  **review-load forecast**, plus a **Grammar** panel (topics mastered, accuracy,
  forecast).
- **Practice modes** — **pronunciation check** (speak a word) and optional Claude
  **speaking / writing / reading**.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

That's it — the full study loop, streaks, grammar, and TTS work with no further
setup (data lives in your browser via IndexedDB).

Useful scripts:

```bash
pnpm test               # validate content + store + SRS unit checks
pnpm validate:content   # check every content block against the schema
pnpm content:generate   # draft a new block from a word list (needs API key)
pnpm build              # production build + typecheck
```

## Authoring content

Content is plain JSON dropped into `content/blocks/` as `block-001.json`,
`block-002.json`, … On load the app reads, validates, and indexes every block.
**Adding a valid block needs no code changes.**

1. Copy the shape of `content/blocks/block-001.json` (full schema in
   [`PROMPT.md` §2.2](./PROMPT.md)). Key rules:
   - Every item needs a **globally-unique, never-reused `id`**.
   - Each vocab item has `cards[]` (each card = one active-recall prompt) and an
     `examples[]` sentence.
   - Card `mode`: `cloze` · `production` · `listening` · `recall_meaning` · `sentence_order`.
   - Grammar `exercises[].type`: `fill_blank` · `error_correction` · `multiple_choice` · `sentence_build`.
2. Validate before running:
   ```bash
   pnpm validate:content
   ```
   Errors are precise, e.g. `block-002.json: vocabulary[3].cards[0].answer — expected string`.

### Generate a block with AI

Draft a schema-valid block from a word list (Claude writes it, the schema gates
it, you review it):

```bash
# words.txt = one word/phrase per line
ANTHROPIC_API_KEY=sk-ant-... pnpm content:generate words.txt --theme "Travel"
pnpm validate:content        # then sanity-check the result
```

The next `block-NNN.json` is created with namespaced, unique ids. It only writes
if the generated JSON passes `blockSchema`.

## Optional: pre-generated audio (layer-2 TTS)

By default pronunciation uses the browser's Web Speech API (free, instant). For
higher-quality Microsoft neural voices, pre-generate MP3s:

```bash
pnpm audio:generate          # writes /public/audio/*.mp3 + URLs back into blocks
pnpm audio:generate --force  # regenerate everything
```

At runtime the app plays the MP3 when present, else falls back to Web Speech.

## Optional: database (Neon + Prisma)

Local storage is the default and works offline. To back data with Postgres:

1. Create a free database at [neon.tech](https://neon.tech) and copy the
   connection string.
2. Copy env and fill in `DATABASE_URL`:
   ```bash
   cp .env.example .env
   ```
3. Push the schema and generate the client:
   ```bash
   pnpm db:push
   pnpm db:generate
   ```
4. Set `NEXT_PUBLIC_STORE_BACKEND=db`.

The repository interface (`src/lib/store/repository.ts`) is identical for both
backends — `LocalRepository` (IndexedDB, client) and `PrismaRepository`
(Postgres, server, `src/lib/store/server.ts`). Mutations in DB mode route
through the server.

> **Note:** Prisma 6 is pinned because Prisma 7 refuses odd-numbered Node
> versions (e.g. Node 23). Use Node 20/22/24 LTS for the smoothest experience.

## Optional: AI practice modes (Claude)

Three Claude-powered modules — each independently feature-flagged, each needs the
same key, and the app runs fine with all of them off:

- **Speaking** (`/speaking`) — chat coach that corrects and encourages.
- **Writing** (`/write`) — write a few sentences using target words → corrections
  + a natural rewrite.
- **Reading** (`/read`) — generates a short, comprehensible passage from your words.

```bash
# in .env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_FEATURE_SPEAKING=true
NEXT_PUBLIC_FEATURE_WRITING=true
NEXT_PUBLIC_FEATURE_READING=true
```

The key stays server-side (`src/app/api/{speaking,writing,reading}/route.ts`).
**Pronunciation check** (say a word, in the Words list) uses the browser's speech
recognition — no key needed.

## Install as an app (PWA)

The app ships a web manifest + service worker, so it's installable (add to home
screen) and the shell works offline after the first visit. The service worker
registers in **production builds only** (`pnpm build && pnpm start`) to avoid dev
HMR conflicts. Icons live in `public/icons/` (regenerate from `icon.svg` with
sharp if you change the mark).

## Project structure

```
content/blocks/        authored JSON content (hot-loaded)
prisma/schema.prisma   DB models (optional)
public/                PWA manifest icons + service worker (sw.js)
scripts/               validator, store/SRS tests, audio + AI block generators
src/
  app/                 routes: dashboard, study, grammar, library, progress,
                       speaking, write, read, settings, api, manifest
  components/          ui (shadcn), study, habits, progress, grammar, library,
                       settings, speaking, writing, reading, shared
  lib/
    content/           Zod schema + loader/validator
    srs/               ts-fsrs wrapper, scheduler, grading, distance, forecast
    study/             session store + queue builder (interleaved, weak-spot)
    grammar/           grammar SRS: cards, CEFR-ladder queue, session, record
    store/             repository interface, local + prisma implementations
    habits/            streak + stats + reminder logic
    speech/            speech-recognition wrapper (pronunciation)
    tts/               Web Speech + audio resolver
    settings/          settings store
    config/            feature flags + store backend switch
```

## Design

*Warm Focus* — a calm paper/ink study surface. The amber accent (`#F2A33C`) is
reserved for the **streak and celebration** so colour means progress. Type:
Fraunces (display) · Inter (body) · JetBrains Mono (IPA/keys). Full responsive,
dark mode, keyboard-accessible (1/2/3/4 grade, Space reveal), and
reduced-motion-aware.

## Deploy

Vercel-native. Push to a repo, import on Vercel. For DB mode, set `DATABASE_URL`
and `NEXT_PUBLIC_STORE_BACKEND=db`; `postinstall` runs `prisma generate`.
