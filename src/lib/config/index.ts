/**
 * Central runtime config + feature flags. Flipping a value here (or its env)
 * should be the only change needed to switch behaviour — e.g. local ⇄ DB store.
 */

export type StoreBackend = "local" | "db";

/** Storage backend. `local` (IndexedDB) works with no server; `db` wired in phase 08. */
export const STORE_BACKEND: StoreBackend =
  (process.env.NEXT_PUBLIC_STORE_BACKEND as StoreBackend) ?? "local";

export const FEATURES = {
  /** Claude-powered speaking practice — enabled only when an API key is set (phase 09). */
  speaking: process.env.NEXT_PUBLIC_FEATURE_SPEAKING === "true",
  /** Claude-powered writing feedback (phase 14). */
  writing: process.env.NEXT_PUBLIC_FEATURE_WRITING === "true",
  /** Claude-generated reading passages from your words (phase 14). */
  reading: process.env.NEXT_PUBLIC_FEATURE_READING === "true",
} as const;
