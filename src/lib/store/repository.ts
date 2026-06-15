import type {
  ExportBundle,
  Settings,
  StoredCardState,
  StoredReviewLog,
  StreakDay,
} from "./types";

/**
 * Storage abstraction. The app talks only to this interface, so switching the
 * backing store (IndexedDB ⇄ Postgres) is a single config change — see
 * `lib/store/index.ts`. Implementations must be safe to call repeatedly.
 */
export interface Repository {
  // --- card states (FSRS) ---
  getCardState(cardId: string): Promise<StoredCardState | undefined>;
  getAllCardStates(): Promise<StoredCardState[]>;
  putCardState(state: StoredCardState): Promise<void>;
  putCardStates(states: StoredCardState[]): Promise<void>;
  /** remove a card's stored state entirely (used to undo a brand-new card's first review) */
  deleteCardState(cardId: string): Promise<void>;

  // --- review log ---
  appendReviewLog(log: StoredReviewLog): Promise<void>;
  getReviewLogs(cardId?: string): Promise<StoredReviewLog[]>;
  /** delete the most recent review log for a card (undo support) */
  removeLastReviewLog(cardId: string): Promise<void>;

  // --- streak / habit calendar ---
  getStreakDays(): Promise<StreakDay[]>;
  getStreakDay(date: string): Promise<StreakDay | undefined>;
  putStreakDay(day: StreakDay): Promise<void>;

  // --- settings (single row) ---
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;

  // --- portability + lifecycle ---
  exportAll(): Promise<ExportBundle>;
  importAll(bundle: ExportBundle): Promise<void>;
  reset(): Promise<void>;
}
