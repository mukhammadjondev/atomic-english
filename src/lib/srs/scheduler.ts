import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";

/**
 * Thin wrapper over ts-fsrs. The UI never touches FSRS math directly — it asks
 * the scheduler to create or advance a card. Each content card is its own FSRS
 * item with independent Difficulty / Stability / Retrievability.
 */

export function makeScheduler(retention = 0.9): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: retention,
      enable_fuzz: true,
    }),
  );
}

export function emptyCard(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

/** Advance a card by one graded review. Returns the next card + the review log. */
export function reviewCard(
  scheduler: FSRS,
  card: FsrsCard,
  grade: Grade,
  now: Date = new Date(),
): RecordLogItem {
  return scheduler.next(card, now, grade);
}

export function isDue(card: FsrsCard, now: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}
