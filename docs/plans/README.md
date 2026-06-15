# Build Plans

Atomic English is built in shippable phases. Execute in order — each phase
leaves the app working. Full spec: [`/PROMPT.md`](../../PROMPT.md).

| # | Phase | Ships |
|---|-------|-------|
| 00 | [Scaffold](./00-scaffold.md) | App boots, Warm Focus tokens, dark mode |
| 01 | [Content layer](./01-content-schema.md) | Zod schemas + loader + `block-001.json` |
| 02 | [Local store](./02-local-store.md) | IndexedDB repository, no DB needed |
| 03 | [SRS + study](./03-srs-study.md) | **Usable study loop** (drill, grade, schedule) |
| 04 | [TTS](./04-tts.md) | Speaker icons everywhere (Web Speech) |
| 05 | [Grammar](./05-grammar.md) | Styled markdown + exercises |
| 06 | [Habit dashboard](./06-habit-dashboard.md) | Streak chain, calendar, confetti |
| 07 | [Polish](./07-polish.md) | a11y, responsive, settings, export/import |
| 08 | [DB](./08-db-neon.md) | Neon + Prisma, config flip |
| 09 | [Audio + Speaking AI](./09-audio-speaking.md) | edge-tts + Claude (opt-in) |
| 10 | [README](./10-readme.md) | Authoring + ops docs |

## Design tokens (Warm Focus)

```
bg #FAF7F2  surface #FFFFFF  ink #1C1A17  muted #6B6157  border #E7E0D6
brand #2F6F5E   reward #F2A33C (streak/celebration ONLY)   ok #3E8E5A  err #C2502E
Display: Fraunces · Body: Inter · Mono: JetBrains Mono
```

## Architecture rule

Business logic lives in `src/lib/<domain>/` (pure, testable). Components stay
thin. Storage is hidden behind `lib/store/repository.ts` so local ⇄ DB is a
single config switch. Each **card** (not word) is the FSRS unit.
