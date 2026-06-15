"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { getRepository } from "@/lib/store";
import { isDue } from "@/lib/srs/scheduler";

/**
 * "Practice grammar" entry on the topic list. Computes how many exercises are
 * due / still new from the local SRS states so the learner knows it's worth
 * starting. Counts resolve after mount (client-only repo).
 */
export function GrammarPracticeCta({ cardIds }: { cardIds: string[] }) {
  const [counts, setCounts] = useState<{ due: number; fresh: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const states = new Map(
        (await getRepository().getAllCardStates()).map((s) => [s.cardId, s]),
      );
      const now = new Date();
      let due = 0;
      let fresh = 0;
      for (const id of cardIds) {
        const st = states.get(id);
        if (st?.introduced) {
          if (isDue(st.fsrs, now)) due++;
        } else {
          fresh++;
        }
      }
      if (active) setCounts({ due, fresh });
    })();
    return () => {
      active = false;
    };
  }, [cardIds]);

  const subtitle = counts
    ? counts.due > 0
      ? `${counts.due} due${counts.fresh > 0 ? ` · ${counts.fresh} new` : ""}`
      : counts.fresh > 0
        ? `${counts.fresh} new to learn`
        : "All caught up"
    : " ";

  return (
    <Link
      href="/grammar/practice"
      className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/50 hover:bg-primary/10"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Dumbbell className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="font-medium">Practice grammar</span>
        <span className="text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
