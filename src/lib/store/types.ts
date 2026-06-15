import type { Card as FsrsCard, ReviewLog as FsrsReviewLog } from "ts-fsrs";

/** Which content stream a card state belongs to. Missing → "vocab" (back-compat). */
export type CardKind = "vocab" | "grammar";

/** FSRS memory state for a single content card. */
export interface StoredCardState {
  /** content card id (e.g. "v-0001-c1" or a grammar exercise id) */
  cardId: string;
  /** owning group id — vocab id for vocab cards, grammar topic id for grammar */
  vocabId: string;
  /** vocab drill vs grammar exercise — keeps the two SRS streams separable */
  kind: CardKind;
  /** raw ts-fsrs card (due, stability, difficulty, reps, lapses, state…) */
  fsrs: FsrsCard;
  /** true once the card has been introduced to the learner */
  introduced: boolean;
}

/** One graded review, appended immutably for stats + undo. */
export interface StoredReviewLog {
  id?: number;
  cardId: string;
  log: FsrsReviewLog;
  reviewedAt: string; // ISO timestamp
}

/** A day on the don't-break-the-chain calendar. `date` is YYYY-MM-DD (local). */
export interface StreakDay {
  date: string;
  cardsCompleted: number;
  goalMet: boolean;
  /** a planned rest day — bridges the chain without counting as study */
  frozen?: boolean;
}

export interface Settings {
  /** new WORDS introduced per day (each brings all its cards) */
  newCardsPerDay: number;
  /** new grammar exercises introduced per day in the grammar practice mode */
  grammarPerDay: number;
  /** max due reviews per day */
  reviewCap: number;
  /** FSRS desired retention (0..1) */
  retention: number;
  /** minimum cards that mark a day "done" (the 2-minute rule) */
  dailyGoalCards: number;
  /** content tags that mark a word as a known weakness — prioritized when new */
  weakSpotTags: string[];
  /** preferred TTS voice name (Web Speech), or null for auto */
  ttsVoice: string | null;
  /** auto-play pronunciation when a card answer is revealed */
  ttsAutoplay: boolean;
  /** "light" | "dark" | "system" — mirrors next-themes */
  theme: "light" | "dark" | "system";
  /** habit-stacking cue, e.g. "After I finish reading at 20:30, I open Atomic English" */
  habitCue: string;
  /** daily reminder time "HH:MM" (local), or "" for off */
  reminderTime: string;
}

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 5,
  grammarPerDay: 6,
  reviewCap: 20,
  retention: 0.9,
  dailyGoalCards: 10,
  weakSpotTags: ["weak-spot"],
  ttsVoice: null,
  ttsAutoplay: false,
  theme: "system",
  habitCue: "",
  reminderTime: "",
};

/** Portable snapshot for export/import + backup. */
export interface ExportBundle {
  version: 1;
  exportedAt: string;
  cardStates: StoredCardState[];
  reviewLogs: StoredReviewLog[];
  streakDays: StreakDay[];
  settings: Settings;
}
