import { Fragment } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DayCell {
  key: string;
  met: boolean;
  isToday: boolean;
  /** planned rest day — bridges the chain */
  frozen?: boolean;
}

/**
 * The signature component: the streak chain. The growing chain is itself the
 * reward — amber means a day was completed; the connectors visualise the
 * unbroken run you don't want to break.
 */
export function StreakChain({
  current,
  days,
}: {
  current: number;
  days: DayCell[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-end gap-3">
        <Flame
          className={cn(
            "size-8",
            current > 0 ? "text-reward" : "text-muted-foreground",
          )}
        />
        <span className="font-display text-6xl leading-none font-semibold tabular-nums">
          {current}
        </span>
        <span className="pb-1 text-muted-foreground">
          day{current === 1 ? "" : "s"} streak
        </span>
      </div>

      <div className="mt-6 flex items-center">
        {days.map((d, i) => {
          const covered = (c: DayCell) => c.met || c.frozen;
          const linked = i > 0 && covered(days[i - 1]) && covered(d);
          return (
            <Fragment key={d.key}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    linked ? "bg-reward" : "bg-border",
                  )}
                />
              )}
              <span
                title={d.frozen ? `${d.key} · rest day` : d.key}
                className={cn(
                  "size-3.5 shrink-0 rounded-full transition-colors",
                  d.met
                    ? "bg-reward shadow-[0_0_0_3px_var(--reward-soft)]"
                    : d.frozen
                      ? "border-2 border-reward/50 bg-reward-soft"
                      : d.isToday
                        ? "border-2 border-dashed border-reward bg-card"
                        : "border border-border bg-card",
                )}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
