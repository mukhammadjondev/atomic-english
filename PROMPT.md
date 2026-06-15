# Atomic English — Build Specification

> A personalized English-learning web platform built on the principles of *Atomic Habits* (James Clear), combined with science-backed language learning methods: **active recall**, **spaced repetition (FSRS)**, **cloze deletion**, and **sentence-based learning**. This document is the complete brief for building the application with Claude Code.

---

## 0. Project Summary

**What we are building:** A single-user (for now) English learning platform that turns the user's daily study into a sustainable *habit*. Content is authored ahead of time as JSON "blocks" (3 days of content each) that are dropped into the project and loaded automatically. The platform drills vocabulary and grammar using proven memory techniques — never showing the answer next to the prompt — and wraps the whole experience in an Atomic Habits motivation layer (streaks, daily minimum goals, celebration effects, "don't break the chain").

**Core philosophy (must inform every UX decision):**
- **Make it obvious** — clear daily call-to-action, visible streak, content always one click away.
- **Make it attractive** — satisfying micro-interactions, clean design, progress that feels rewarding.
- **Make it easy** — a "2-minute" minimum daily goal; starting is frictionless.
- **Make it satisfying** — immediate positive feedback (celebration effects) after each completed session; visible chain that the user does not want to break.

**Who it is for:** An intermediate (B1–B2) learner whose weak grammar areas are: Conditionals (esp. Third + inversion), Passive Voice, Gerund/Infinitive, subject–verb agreement in tricky cases ("one of the…"), and prepositions (despite / in spite of). Content prioritizes these.

---

## 1. Tech Stack (required)

- **Framework:** Next.js (App Router, latest stable) with TypeScript.
- **Why Next.js:** frontend + backend (API routes / server actions) live in one codebase; easy to add a real backend and DB later without re-architecting.
- **Styling:** Tailwind CSS. Optionally shadcn/ui for base components, but keep the visual identity custom (see Design section — do not ship a default template look).
- **Spaced Repetition engine:** [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) (npm: `ts-fsrs`). This is the modern FSRS algorithm, ~20–30% more efficient than SM-2. Do NOT hand-roll an SRS algorithm.
- **Database:** Start with a hosted Postgres with a generous free tier — use **Neon** (`neon.tech`, serverless Postgres, free tier) OR **Supabase** (free tier, also gives auth later). Pick Neon for simplicity if no auth is needed yet. Access via **Prisma** ORM (type-safe, easy migrations).
  - **Important:** Architect data access behind a repository/service layer so that, before the DB is connected, the app can run against `localStorage`/IndexedDB as a fallback. The switch from local → DB should be a single config change. Implement the local fallback first so the app works end-to-end on day one, then wire Neon.
- **Text-to-Speech:** Two-layer approach (see TTS section).
- **Markdown rendering:** `react-markdown` + `remark-gfm` for grammar explanations.
- **Animations / celebration effects:** `framer-motion` for UI transitions; `canvas-confetti` for celebration bursts.
- **State:** React Server Components where sensible; client state with Zustand (lightweight) for the active study session.
- **Deployment target:** Vercel (free tier, native Next.js host). Keep everything Vercel-compatible.

---

## 2. Content System (JSON blocks)

Content is authored externally (by the user with Claude's help) and placed in `/content/blocks/` as JSON files named `block-001.json`, `block-002.json`, etc. On startup the app reads all blocks, validates them against a schema (use **Zod**), and seeds/updates the database (or local store).

### 2.1 Design goals for the schema
- **Extensible:** adding new card types, exercise types, or media must not break older blocks. Every entity has a `schemaVersion` and an explicit `type` discriminator.
- **Strongly modeled:** every learnable item has a stable unique `id` (never reused), a part of speech, IPA, audio reference, and at least one example sentence with its own cloze.
- **Future-proof:** include optional fields now (audio URLs, tags, difficulty, CEFR level, related word IDs) so we never need a migration just to add metadata.

### 2.2 JSON Schema (authoritative)

```jsonc
{
  "schemaVersion": "1.0",
  "blockId": "block-001",
  "order": 1,                       // sort order across blocks
  "days": [1, 2, 3],                // which study-days this block covers
  "theme": "Daily Habits & Routines",
  "cefr": "B1",
  "tags": ["habits", "daily-life"],

  "vocabulary": [
    {
      "id": "v-0001",               // GLOBALLY UNIQUE, NEVER REUSED
      "type": "vocab",
      "word": "establish",
      "pos": "verb",                // noun | verb | adjective | adverb | phrase | idiom | phrasal_verb
      "ipa": "/ɪˈstæblɪʃ/",
      "meaningUz": "shakllantirmoq, o'rnatmoq",
      "meaningEn": "to create or set up something that lasts",
      "audioUrl": null,             // null => generate via TTS at runtime; or a pre-generated /audio/v-0001.mp3
      "difficulty": 2,              // 1..5 author hint (FSRS still learns the real value)
      "tags": ["habits"],
      "relatedIds": ["v-0007"],     // optional links to other words
      "cards": [                    // each card = one active-recall prompt. The platform NEVER shows the answer beside the prompt.
        {
          "id": "v-0001-c1",
          "mode": "cloze",          // cloze | recall_meaning | listening | production | sentence_order
          "prompt": "I'm trying to ______ a new habit of reading every day.",
          "answer": "establish",
          "hint": "verb, /ɪˈstæblɪʃ/"
        },
        {
          "id": "v-0001-c2",
          "mode": "production",     // Uz meaning shown -> user must produce the English word
          "prompt": "shakllantirmoq (fe'l)",
          "answer": "establish"
        },
        {
          "id": "v-0001-c3",
          "mode": "listening",      // audio plays -> user types what they hear
          "prompt": "{{audio}}",
          "answer": "establish"
        }
      ],
      "examples": [
        {
          "en": "It takes time to establish a routine.",
          "uz": "Tartib o'rnatish vaqt talab qiladi.",
          "audioUrl": null
        }
      ]
    }
  ],

  "grammar": [
    {
      "id": "g-0001",
      "type": "grammar",
      "topic": "Third Conditional",
      "cefr": "B2",
      "tags": ["conditionals", "weak-spot"],
      "explanationMd": "## Third Conditional\n\nUsed for **unreal situations in the past** — things that did *not* happen.\n\n**Structure:** `If + past perfect, would have + V3`\n\n> If I **had known**, I **would have told** you.\n\n### Common mistakes\n- ❌ *If I would have known...* — never use `would` in the `if`-clause.\n- ✅ *If I had known...*\n\n### Inversion (formal)\nYou can drop `if` and invert:\n> **Had I known**, I would have told you.",
      "exercises": [
        {
          "id": "g-0001-e1",
          "type": "fill_blank",
          "prompt": "If I ______ (know), I would have told you.",
          "answer": "had known",
          "accepted": ["had known"],          // alternative correct answers
          "explanationMd": "Third conditional uses **past perfect** in the if-clause."
        },
        {
          "id": "g-0001-e2",
          "type": "error_correction",
          "prompt": "If I would have known, I would have helped.",
          "answer": "If I had known, I would have helped.",
          "explanationMd": "Never use `would` in the if-clause."
        },
        {
          "id": "g-0001-e3",
          "type": "multiple_choice",
          "prompt": "______ harder, he would have passed.",
          "options": ["If he studied", "Had he studied", "Did he study", "Should he study"],
          "answer": "Had he studied",
          "explanationMd": "Inversion of *If he had studied*."
        },
        {
          "id": "g-0001-e4",
          "type": "sentence_build",            // user assembles a sentence from word tiles
          "prompt": "Build: (you / if / had / called / I / would have / answered)",
          "answer": "If you had called, I would have answered."
        }
      ]
    }
  ],

  "speaking": [
    {
      "id": "s-0001",
      "type": "speaking",
      "promptEn": "Describe a habit you want to build and why.",
      "promptUz": "Shakllantirmoqchi bo'lgan odatingizni va sababini tasvirlang.",
      "targetWords": ["v-0001"],     // words we hope the learner uses
      "rubric": "Encourage use of present tense + habit vocabulary."
    }
  ]
}
```

### 2.3 Validation
- Define Zod schemas mirroring the above. On load, **fail loudly** with a clear console + UI message if a block is malformed (e.g. "block-002.json: vocabulary[3].cards[0] missing 'answer'"). Treat author errors as first-class — good error messages save hours.

---

## 3. Learning Engine (the science — non-negotiable rules)

These rules implement active recall + spaced repetition correctly. Get these right above all else.

1. **Never show the answer beside the prompt.** The learner must *retrieve* it. This is active recall — the single most important principle. Reveal the answer only AFTER the learner submits or explicitly taps "Show answer."

2. **Cloze deletion is the primary vocab mode** — the word is removed from a real sentence and the learner fills the gap from context, rather than translating in isolation. Provide translation/meaning only as a separate `production` card or as an after-the-fact reveal, never as a side-by-side crutch.

3. **FSRS scheduling.** Each *card* (not each word) is an FSRS item with its own memory state (Difficulty, Stability, Retrievability). After the learner answers, capture a grade and feed it to `ts-fsrs`:
   - 4-button grading: **Again / Hard / Good / Easy** (FSRS standard).
   - For typed answers, auto-grade: exact/accepted match → default to **Good** (let the user bump to Easy/Hard); wrong → **Again**.
   - Store `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `last_review` per card in the DB.
   - Desired retention target: **0.90** (configurable in settings; note that pushing toward 0.95 sharply increases review load).

4. **Daily session = due reviews + a small number of new cards.** Default: up to 20 due reviews + 5 new cards/day (both configurable). Reviews always come before new cards.

5. **Sentence-based.** Always present words inside real sentences, not bare word lists.

6. **Daily study is the habit.** Surface a clear "today" queue. If the queue is empty, say so positively and offer optional extra practice — never a blank screen.

---

## 4. Text-to-Speech (TTS)

Pronunciation playback must be available anywhere a word, example sentence, or grammar example appears — via a small speaker icon.

**Layer 1 — default, zero-dependency:** the browser's built-in **Web Speech API** (`window.speechSynthesis`). Pick an English (en-US / en-GB) voice, prefer a higher-quality named voice when available. Expose a small `speak(text, lang)` utility. Works offline, free, instant.

**Layer 2 — higher-quality native voices (progressive enhancement):** allow pre-generated MP3 audio per item (`audioUrl`). Provide a build-time script `scripts/generate-audio.ts` that uses **`edge-tts`** (free, very natural Microsoft neural voices, e.g. `en-US-AriaNeural`, `en-GB-RyanNeural`) to generate MP3s for every word and example sentence into `/public/audio/{id}.mp3`, and writes the URLs back into the blocks. At runtime: if `audioUrl` exists, play the MP3; otherwise fall back to Layer 1 Web Speech.

**UX:** speaker icon shows a subtle loading/playing state; clicking again replays; respect `prefers-reduced-motion` for any animation but audio still plays. Add a settings toggle for auto-play on card reveal.

---

## 5. Grammar Rendering

- Grammar `explanationMd` and per-exercise `explanationMd` are **Markdown** → render with `react-markdown` + `remark-gfm`.
- Style the rendered Markdown to match the app's design (custom prose styles, not default browser styling): clear headings, styled blockquotes for examples, distinct ✅/❌ callouts for correct/incorrect patterns, inline `code` for structures like `If + past perfect`.
- Every English example inside grammar content should have a speaker icon (reuse the TTS utility).

---

## 6. Atomic Habits Motivation Layer (a first-class feature, not decoration)

This is what differentiates the platform. Build a **Habit Dashboard** as the home screen.

- **Streak counter** ("🔥 7 day streak") — increments when the daily minimum goal is met; the rule is "never miss twice." If a day is missed, the chain resets but show an encouraging recovery message, not a punishment.
- **Don't-break-the-chain calendar** — a month grid; completed days marked. Visual chain growth is itself the reward (the satisfying loop).
- **Daily minimum goal ("2-minute rule")** — e.g. "Complete 10 cards" marks the day done. Keep the bar low so starting is easy; the user can always do more.
- **Celebration effects** — on completing a session or hitting the daily goal, fire a tasteful `canvas-confetti` burst + a short encouraging message ("Nice — chain extended to 8 days!"). Keep it quick and classy, not childish. Respect `prefers-reduced-motion` (use a static celebration state instead of motion when set).
- **Identity reinforcement** — occasionally surface identity-based affirmations ("You're becoming someone who studies English every day"), per Clear's identity-based-habits idea.
- **Progress without pressure** — show steady-progress stats (words learned, cards mastered, accuracy trend). Avoid guilt mechanics; missed days get a gentle "welcome back, let's keep going."
- **Habit stacking hint** — in onboarding/settings, let the user record their cue ("After I finish reading at 20:30, I open Atomic English") and show it on the dashboard as a reminder of their plan.

---

## 7. Additional Useful Features (build what's reasonable; stub the rest cleanly)

- **Smart review priority:** weak-spot tags (e.g. `weak-spot`, `conditionals`) get slightly higher new-card priority so the user's actual weaknesses surface first.
- **Mistake log / "Leeches":** cards failed repeatedly are flagged and collected into a "Tricky cards" view for focused practice (FSRS lapses count).
- **Speaking practice via Claude:** the `speaking` items open a chat-style panel that calls the Anthropic API to (a) ask the prompt, (b) read the user's English answer, (c) correct grammar/vocab errors with short explanations, and (d) encourage. (See the in-artifact Anthropic API pattern; in Next.js, call the API from a server route so the key stays server-side.) Make this module optional/feature-flagged so the app runs without an API key.
- **Search & filter** across all learned words and grammar topics.
- **Dark mode**, fully responsive (mobile-first — the user studies in the evening, likely on phone too), visible keyboard focus, keyboard shortcuts for grading (1/2/3/4 = Again/Hard/Good/Easy, Space = reveal/next).
- **Settings:** daily new-card limit, daily review cap, retention target, TTS voice + autoplay, theme.
- **Data export/import** (JSON) so progress is portable and backup-able.
- **Offline-friendly:** local fallback store means the core loop works without network.

---

## 8. Design Direction (avoid a templated look)

Do not ship the generic AI look (cream + serif + terracotta; or near-black + single acid accent; or broadsheet hairline columns). Make deliberate choices for *this* subject: a calm, focused study environment that rewards consistency.

- **Concept:** "quiet focus, rewarding streaks." The interface should feel calm during study (low distraction, generous whitespace, one task at a time) and come alive at moments of reward (streak extension, session complete).
- **Typography:** pick a characterful but legible display face for headings/streak numbers and a clean, comfortable body/reading face for sentences and grammar prose; a mono/utility face for IPA and keyboard hints. Define a clear type scale.
- **Color:** define a 4–6 color named palette with a single, intentional "reward" accent reserved for streaks/celebration so that color *means* progress. Document the hex values.
- **Signature element:** the streak chain — make it the one memorable, beautifully executed component.
- **Motion:** restrained during study; one orchestrated celebration moment on completion. Respect reduced-motion.
- **Copy:** plain, encouraging, second-person; errors explain and guide; empty states invite action. Never guilt the user.

Briefly state the chosen palette + type pairing before building, then follow it consistently.

---

## 9. Suggested Project Structure

```
atomic-english/
├── content/blocks/              # block-001.json, block-002.json, ...
├── prisma/schema.prisma         # DB models (UserCardState, ReviewLog, StreakDay, Settings)
├── public/audio/                # pre-generated MP3s (optional, layer-2 TTS)
├── scripts/generate-audio.ts    # edge-tts pre-generation
├── src/
│   ├── app/                     # Next.js App Router pages + API routes
│   │   ├── (dashboard)/page.tsx # Habit dashboard (home)
│   │   ├── study/               # review session UI
│   │   ├── grammar/             # grammar topics + rendered markdown
│   │   ├── speaking/            # Claude-powered speaking practice
│   │   └── api/                 # server routes (speaking proxy, sync)
│   ├── lib/
│   │   ├── srs/                 # ts-fsrs wrapper, scheduler
│   │   ├── content/             # zod schemas, block loader/validator
│   │   ├── tts/                 # speak() util + audio resolver
│   │   ├── store/               # repository layer: local <-> DB switch
│   │   └── habits/              # streak + goal logic
│   ├── components/              # Card, ClozeInput, GradeButtons, StreakChain, ConfettiBurst, MarkdownProse, SpeakerButton ...
│   └── styles/
└── README.md                    # how to add a content block, run audio gen, connect Neon
```

---

## 10. Build Order (do it in this sequence)

1. **Scaffold** Next.js + TS + Tailwind; set design tokens (palette, type scale) per Design section.
2. **Content layer:** Zod schemas + block loader + the example `block-001.json` (use sample content below) with clear validation errors.
3. **Local store** repository layer (localStorage/IndexedDB) so the loop works with no DB.
4. **SRS:** integrate `ts-fsrs`; build the study session (cloze + the other card modes), grading, scheduling.
5. **TTS layer 1** (Web Speech) + SpeakerButton everywhere.
6. **Grammar module** with `react-markdown` styled prose + exercises.
7. **Habit dashboard:** streak, chain calendar, daily goal, confetti celebration, identity affirmations.
8. **Polish:** dark mode, responsive, keyboard shortcuts, settings, reduced-motion.
9. **DB:** add Prisma + Neon; flip the repository layer from local → DB via config; keep local as fallback.
10. **Optional:** edge-tts pre-generation script; Claude-powered speaking module (feature-flagged).
11. **README** explaining how to author and drop in new content blocks.

Keep every step shippable. The user should be able to study after step 4, even before DB and audio polish.

---

## 11. Acceptance Criteria (definition of done for v1)

- [ ] Dropping a valid `block-00X.json` into `/content/blocks/` makes its content appear with no code changes.
- [ ] Vocab is drilled via cloze with the answer hidden until submit; FSRS schedules each card.
- [ ] Grammar explanations render from Markdown, styled, with playable example audio.
- [ ] Every word/sentence has a working speaker icon (Web Speech at minimum).
- [ ] Daily session = due reviews + capped new cards; empty-queue state is positive.
- [ ] Streak, don't-break-the-chain calendar, and a tasteful confetti celebration all work; reduced-motion respected.
- [ ] Works fully on local store with no DB and no API key; DB and speaking module are clean opt-ins.
- [ ] Mobile-responsive, keyboard-accessible, dark mode.

---

## 12. Sample content (seed `block-001.json` from this)

Author `block-001.json` for theme **"Daily Habits & Routines"** containing: ~8 vocabulary items (establish, consistency, gradually, stick to, effortless, set aside, setback, keep track of) each with cloze + production + listening cards and an example sentence; one grammar topic **Third Conditional** (the user's weak spot) with the four exercise types shown above; and two speaking prompts about habit-building. Follow the schema in §2.2 exactly.

---

*End of specification. Build with care: correctness of the active-recall + FSRS loop and the quality of the habit/motivation layer are what make this platform worth using.*
