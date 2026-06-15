import { z } from "zod";

/**
 * Authoritative content schema (mirrors PROMPT.md §2.2).
 *
 * Extensibility rules:
 * - Every entity carries an explicit `type`/`mode` discriminator and the block
 *   carries a `schemaVersion`, so new variants can be added without breaking
 *   older blocks.
 * - Forward-looking optional fields (audioUrl, tags, difficulty, relatedIds…)
 *   exist now so adding metadata later never requires a migration.
 */

export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrSchema = z.enum(CEFR);

export const POS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "idiom",
  "phrasal_verb",
] as const;

export const CARD_MODES = [
  "cloze",
  "recall_meaning",
  "listening",
  "production",
  "sentence_order",
] as const;

export const EXERCISE_TYPES = [
  "fill_blank",
  "error_correction",
  "multiple_choice",
  "sentence_build",
] as const;

const nonEmpty = z.string().min(1);
const idSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9-]+$/, "id must be lowercase letters, digits, or hyphens");

/* --------------------------------------------------------------- vocabulary */

export const cardSchema = z.object({
  id: idSchema,
  mode: z.enum(CARD_MODES),
  prompt: nonEmpty,
  answer: nonEmpty,
  /** alternative correct answers accepted on auto-grade */
  accepted: z.array(nonEmpty).optional(),
  hint: z.string().optional(),
});

export const exampleSchema = z.object({
  en: nonEmpty,
  uz: nonEmpty,
  audioUrl: z.string().nullable().optional(),
});

export const vocabSchema = z.object({
  id: idSchema,
  type: z.literal("vocab"),
  word: nonEmpty,
  pos: z.enum(POS),
  ipa: z.string().optional(),
  meaningUz: nonEmpty,
  meaningEn: nonEmpty,
  audioUrl: z.string().nullable().optional(),
  /** author hint 1..5; FSRS still learns the real difficulty */
  difficulty: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  relatedIds: z.array(idSchema).optional(),
  cards: z.array(cardSchema).min(1, "a vocab item needs at least one card"),
  examples: z.array(exampleSchema).optional(),
});

/* ------------------------------------------------------------------ grammar */

const exerciseBase = {
  id: idSchema,
  prompt: nonEmpty,
  answer: nonEmpty,
  explanationMd: z.string().optional(),
};

export const exerciseSchema = z.discriminatedUnion("type", [
  z.object({
    ...exerciseBase,
    type: z.literal("fill_blank"),
    accepted: z.array(nonEmpty).optional(),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal("error_correction"),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal("multiple_choice"),
    options: z.array(nonEmpty).min(2, "multiple_choice needs ≥2 options"),
  }),
  z.object({
    ...exerciseBase,
    type: z.literal("sentence_build"),
  }),
]);

export const grammarSchema = z.object({
  id: idSchema,
  type: z.literal("grammar"),
  topic: nonEmpty,
  cefr: cefrSchema.optional(),
  tags: z.array(z.string()).optional(),
  explanationMd: nonEmpty,
  exercises: z.array(exerciseSchema).min(1),
});

/* ----------------------------------------------------------------- speaking */

export const speakingSchema = z.object({
  id: idSchema,
  type: z.literal("speaking"),
  promptEn: nonEmpty,
  promptUz: nonEmpty,
  targetWords: z.array(idSchema).optional(),
  rubric: z.string().optional(),
});

/* -------------------------------------------------------------------- block */

export const blockSchema = z.object({
  schemaVersion: nonEmpty,
  blockId: idSchema,
  order: z.number().int(),
  days: z.array(z.number().int()).min(1),
  theme: nonEmpty,
  cefr: cefrSchema.optional(),
  tags: z.array(z.string()).optional(),
  vocabulary: z.array(vocabSchema).default([]),
  grammar: z.array(grammarSchema).default([]),
  speaking: z.array(speakingSchema).default([]),
});

export type Card = z.infer<typeof cardSchema>;
export type CardMode = (typeof CARD_MODES)[number];
export type Example = z.infer<typeof exampleSchema>;
export type Vocab = z.infer<typeof vocabSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type Grammar = z.infer<typeof grammarSchema>;
export type Speaking = z.infer<typeof speakingSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Cefr = (typeof CEFR)[number];
export type Pos = (typeof POS)[number];
