"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SpeakerButton } from "@/components/shared/speaker-button";
import { PronounceButton } from "@/components/shared/pronounce-button";
import { getRepository } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { VocabSummary } from "@/lib/library/content";

const LEECH_THRESHOLD = 3; // lapses that flag a "tricky" card

type Filter = "all" | "learned" | "tricky";

interface Overlay {
  introduced: boolean;
  lapses: number;
}

export function LibraryView({ words }: { words: VocabSummary[] }) {
  const [overlay, setOverlay] = useState<Map<string, Overlay>>(new Map());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    (async () => {
      const states = await getRepository().getAllCardStates();
      const byCard = new Map(states.map((s) => [s.cardId, s]));
      const map = new Map<string, Overlay>();
      for (const w of words) {
        let introduced = false;
        let lapses = 0;
        for (const id of w.cardIds) {
          const st = byCard.get(id);
          if (st?.introduced) introduced = true;
          lapses += st?.fsrs.lapses ?? 0;
        }
        map.set(w.id, { introduced, lapses });
      }
      setOverlay(map);
    })();
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      const o = overlay.get(w.id);
      if (filter === "learned" && !o?.introduced) return false;
      if (filter === "tricky" && (o?.lapses ?? 0) < LEECH_THRESHOLD) return false;
      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) ||
        w.meaningEn.toLowerCase().includes(q) ||
        w.meaningUz.toLowerCase().includes(q)
      );
    });
  }, [words, overlay, query, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "learned", label: "Learned" },
    { key: "tricky", label: "Tricky" },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words or meanings…"
          className="h-11 pl-9"
          aria-label="Search vocabulary"
        />
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === f.key
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          {filter === "tricky"
            ? "No tricky cards — nice and steady."
            : "Nothing matches that search."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((w) => {
            const o = overlay.get(w.id);
            const tricky = (o?.lapses ?? 0) >= LEECH_THRESHOLD;
            return (
              <li key={w.id} className="flex items-start gap-1 p-4">
                <SpeakerButton text={w.word} audioUrl={w.audioUrl} size="icon-sm" />
                <PronounceButton word={w.word} />
                <div className="ml-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">
                      {w.word}
                    </span>
                    <span className="text-xs text-muted-foreground">{w.pos}</span>
                    {w.ipa && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {w.ipa}
                      </span>
                    )}
                    {tricky && <Badge variant="destructive">tricky · {o?.lapses}</Badge>}
                    {!o?.introduced && <Badge variant="secondary">new</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground">{w.meaningEn}</span> ·{" "}
                    {w.meaningUz}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
