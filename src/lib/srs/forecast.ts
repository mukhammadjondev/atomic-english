import { State } from "ts-fsrs";
import type { StoredCardState } from "@/lib/store/types";
import { addDays, dayKey } from "@/lib/date";

export interface ForecastDay {
  date: string;
  /** number of cards whose next review lands on this day */
  due: number;
  /** true for the first bucket, which also absorbs anything overdue */
  isToday: boolean;
}

/**
 * Upcoming review load: for each of the next `days`, how many introduced cards
 * fall due. Anything already due/overdue is folded into today's bucket so the
 * learner sees the real backlog. New (unscheduled) cards are excluded.
 */
export function reviewForecast(
  states: StoredCardState[],
  days = 14,
  today: string = dayKey(),
): ForecastDay[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) buckets.set(addDays(today, i), 0);

  for (const s of states) {
    if (!s.introduced || s.fsrs.state === State.New) continue;
    const d = dayKey(new Date(s.fsrs.due));
    const key = d <= today ? today : d;
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }

  return [...buckets.entries()].map(([date, due]) => ({
    date,
    due,
    isToday: date === today,
  }));
}
