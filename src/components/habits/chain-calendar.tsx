import { dayKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Don't-break-the-chain month grid. Completed days are amber; rest days softer. */
export function ChainCalendar({
  metDates,
  frozenDates,
  month = new Date(),
}: {
  metDates: Set<string>;
  frozenDates?: Set<string>;
  month?: Date;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const today = dayKey();

  const first = new Date(year, m, 1);
  // Monday-first offset (JS getDay: 0=Sun)
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(year, m, i + 1))),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">
          {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-2xs font-medium text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`pad-${i}`} />;
          const met = metDates.has(key);
          const frozen = frozenDates?.has(key) ?? false;
          const isToday = key === today;
          const dayNum = Number(key.slice(-2));
          return (
            <span
              key={key}
              title={frozen ? "Rest day" : undefined}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-sm tabular-nums",
                met
                  ? "bg-reward font-medium text-[#1c1a17]"
                  : frozen
                    ? "bg-reward-soft font-medium text-reward"
                    : "text-muted-foreground",
                isToday && !met && !frozen && "ring-2 ring-reward ring-inset",
              )}
            >
              {dayNum}
            </span>
          );
        })}
      </div>
    </div>
  );
}
