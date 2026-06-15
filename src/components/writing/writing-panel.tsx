"use client";

import { useMemo, useState } from "react";
import { PenLine, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkdownProse } from "@/components/shared/markdown-prose";
import { seededShuffle } from "@/lib/shuffle";

/**
 * Free-writing practice: the learner writes a few sentences using a handful of
 * target words, and Claude returns corrections + a natural rewrite.
 */
export function WritingPanel({ words }: { words: string[] }) {
  const [seed, setSeed] = useState(0);
  const targets = useMemo(
    () => seededShuffle(words, `write-${seed}`).slice(0, 5),
    [words, seed],
  );
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, targetWords: targets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setFeedback(data.feedback);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium">
            <PenLine className="size-4 text-primary" /> Use these words
          </p>
          {words.length > 5 && (
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Shuffle className="size-3.5" /> New set
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {targets.map((w) => (
            <Badge key={w} variant="secondary" className="text-sm">
              {w}
            </Badge>
          ))}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a few sentences using the words above…"
        rows={6}
        className="w-full resize-y rounded-2xl border border-input bg-transparent p-4 text-lg leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <Button size="lg" onClick={submit} disabled={loading || !text.trim()}>
        {loading ? "Checking…" : "Get feedback"}
      </Button>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {feedback && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <MarkdownProse markdown={feedback} />
        </div>
      )}
    </div>
  );
}
