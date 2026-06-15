import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Daily-minimum goal (the 2-minute rule). Low bar so starting is easy. */
export function DailyGoal({
  completed,
  goal,
}: {
  completed: number;
  goal: number;
}) {
  const done = completed >= goal;
  const pct = Math.min(100, (completed / Math.max(1, goal)) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Today&apos;s goal</p>
          <p className="font-display text-2xl font-semibold">
            {Math.min(completed, goal)} / {goal} cards
          </p>
        </div>
        {done && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-reward-soft px-3 py-1 text-sm font-medium text-reward">
            <Check className="size-4" /> Done
          </span>
        )}
      </div>

      <Progress value={pct} className="mt-4 h-2" />

      <Button
        nativeButton={false}
        size="lg"
        variant={done ? "outline" : "default"}
        className="mt-5 w-full"
        render={<Link href="/study" />}
      >
        {done ? "Keep going" : completed > 0 ? "Continue session" : "Start today’s session"}
      </Button>
    </div>
  );
}
