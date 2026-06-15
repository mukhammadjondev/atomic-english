import type { Repository } from "@/lib/store/repository";
import type { Settings, StreakDay } from "@/lib/store/types";
import { addDays, dayKey } from "@/lib/date";

export interface StreakInfo {
  current: number;
  longest: number;
  /** true if today's daily goal is already met (or today is a rest day) */
  todayDone: boolean;
  /** rest-day tokens still available (earned minus used) */
  freezeAvailable: number;
}

/** One freeze token earned per this many completed days. */
const DAYS_PER_FREEZE = 7;

/**
 * Compute streak from the habit calendar. A streak is consecutive days that met
 * the daily goal; a **frozen** (planned rest) day bridges the chain without
 * counting as a study day. Today not being done yet does NOT break the streak —
 * we count back from yesterday — supporting the gentle "never miss twice" framing.
 */
export function computeStreak(
  days: StreakDay[],
  today: string = dayKey(),
): StreakInfo {
  const met = new Set(days.filter((d) => d.goalMet).map((d) => d.date));
  const frozen = new Set(days.filter((d) => d.frozen).map((d) => d.date));
  const covered = (d: string) => met.has(d) || frozen.has(d);

  const todayDone = covered(today);
  let cursor = todayDone ? today : addDays(today, -1);
  let current = 0;
  while (covered(cursor)) {
    if (met.has(cursor)) current++; // rest days bridge but don't add
    cursor = addDays(cursor, -1);
  }

  // longest run across all covered days
  const sorted = [...new Set([...met, ...frozen])].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev && addDays(prev, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  const earned = Math.floor(met.size / DAYS_PER_FREEZE);
  const freezeAvailable = Math.max(0, earned - frozen.size);

  return { current, longest, todayDone, freezeAvailable };
}

/**
 * Mark a day as a planned rest (freeze). Consumes an earned token; no-ops if none
 * are available or the day is already covered. Returns the updated streak info.
 */
export async function spendRestDay(
  repo: Repository,
  date: string = dayKey(),
): Promise<StreakInfo> {
  const days = await repo.getStreakDays();
  const info = computeStreak(days, date);
  const existing = days.find((d) => d.date === date);
  const alreadyCovered =
    (existing?.goalMet ?? false) || (existing?.frozen ?? false);

  if (info.freezeAvailable <= 0 || alreadyCovered) return info;

  await repo.putStreakDay({
    date,
    cardsCompleted: existing?.cardsCompleted ?? 0,
    goalMet: false,
    frozen: true,
  });
  return computeStreak(await repo.getStreakDays(), date);
}

/**
 * Record one completed card against today's habit day. Marks the day "done"
 * once the daily minimum (the 2-minute rule) is reached.
 */
export async function recordCardCompleted(
  repo: Repository,
  settings: Settings,
  now: Date = new Date(),
): Promise<StreakDay> {
  const date = dayKey(now);
  const existing = await repo.getStreakDay(date);
  const cardsCompleted = (existing?.cardsCompleted ?? 0) + 1;
  const day: StreakDay = {
    date,
    cardsCompleted,
    goalMet: cardsCompleted >= settings.dailyGoalCards,
  };
  await repo.putStreakDay(day);
  return day;
}
