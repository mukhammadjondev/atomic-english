"use client";

import { useState } from "react";
import { BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownProse } from "@/components/shared/markdown-prose";
import { SpeakerButton } from "@/components/shared/speaker-button";

/**
 * Generates a short, comprehensible passage built from the learner's words —
 * context immersion. Calls Claude on demand; the whole feature is opt-in.
 */
export function ReadingPanel({ words }: { words: string[] }) {
  const [passage, setPassage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setPassage(data.passage);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button size="lg" onClick={generate} disabled={loading} className="gap-2">
        <BookText className="size-4" />
        {loading ? "Writing…" : passage ? "New passage" : "Generate a passage"}
      </Button>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {passage && (
        <article className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="mb-2 flex justify-end">
            <SpeakerButton text={stripMarkdown(passage)} label="Read aloud" />
          </div>
          <MarkdownProse markdown={passage} />
        </article>
      )}
    </div>
  );
}

/** Rough plain-text for TTS — drop heading/emphasis markers. */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>]/g, "")
    .trim();
}
