import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { ContentError } from "@/lib/content/format-error";
import { vocabList } from "@/lib/library/content";
import { ReadingPanel } from "@/components/reading/reading-panel";

export const dynamic = "force-dynamic";

export default async function ReadPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  let words: string[] = [];
  let errorMessage: string | null = null;
  try {
    const { blocks } = await loadBlocks();
    words = vocabList(blocks).map((v) => v.word);
  } catch (e) {
    errorMessage =
      e instanceof ContentError ? e.message : "Failed to load content.";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-semibold">Reading</h1>
        <p className="text-muted-foreground">
          A short passage built from your words — read it, hear it, absorb the
          patterns.
        </p>
      </header>

      {!configured && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          Reading practice is optional. Add{" "}
          <code className="mx-1">ANTHROPIC_API_KEY</code> to generate passages.
        </p>
      )}

      {errorMessage ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm text-destructive">
          {errorMessage}
        </pre>
      ) : (
        <ReadingPanel words={words} />
      )}
    </main>
  );
}
