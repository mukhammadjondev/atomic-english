"use client";

import { parseDayKey } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  date: string;
  value: number;
}

function shortDate(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Vertical bars, height proportional to value. Pure CSS — crisp + responsive. */
export function BarChart({
  data,
  max,
  format = (v) => String(v),
  highlightDate,
}: {
  data: ChartDatum[];
  max?: number;
  format?: (v: number) => string;
  /** day-key to emphasize (e.g. today) */
  highlightDate?: string;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex h-32 items-end gap-[3px]">
        {data.map((d) => {
          const hot = d.date === highlightDate;
          return (
            <div
              key={d.date}
              title={`${shortDate(d.date)}: ${format(d.value)}`}
              className="flex h-full flex-1 items-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-sm transition-colors",
                  hot ? "bg-reward" : "bg-primary/60",
                )}
                style={{ height: `${Math.max(2, (d.value / top) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-2xs text-muted-foreground">
        <span>{shortDate(data[0]?.date ?? "")}</span>
        <span>{shortDate(data[data.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  );
}

/** A smooth cumulative line for a monotonic series (words learned over time). */
export function Sparkline({ data }: { data: ChartDatum[] }) {
  const w = 100;
  const h = 40;
  const top = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const pts = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.value / top) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  const area = `0,${h} ${line} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-28 w-full"
      role="img"
      aria-label="Words learned over time"
    >
      <polygon points={area} className="fill-primary/10" />
      <polyline
        points={line}
        className="fill-none stroke-primary"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
