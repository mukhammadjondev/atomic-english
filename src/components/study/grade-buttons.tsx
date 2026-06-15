"use client";

import type { Grade } from "ts-fsrs";
import { GRADES, type GradeTone } from "@/lib/srs/grade";
import { cn } from "@/lib/utils";

const toneClass: Record<GradeTone, string> = {
  err: "border-destructive/40 text-destructive hover:bg-destructive/10",
  muted: "border-border text-muted-foreground hover:bg-muted",
  brand: "border-primary/40 text-primary hover:bg-primary/10",
  success: "border-success/40 text-success hover:bg-success/10",
};

export function GradeButtons({
  onGrade,
  suggested,
}: {
  onGrade: (rating: Grade) => void;
  suggested?: Grade | null;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {GRADES.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onGrade(g.rating)}
          className={cn(
            "flex flex-col items-center gap-0.5 rounded-xl border bg-card px-2 py-2.5 text-sm font-medium transition-colors",
            toneClass[g.tone],
            suggested === g.rating && "ring-2 ring-primary/50",
          )}
        >
          <span>{g.label}</span>
          <kbd className="font-mono text-2xs text-muted-foreground">{g.key}</kbd>
        </button>
      ))}
    </div>
  );
}
