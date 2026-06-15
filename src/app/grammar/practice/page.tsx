import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { ContentError } from "@/lib/content/format-error";
import { grammarCardsFrom } from "@/lib/grammar/cards";
import { GrammarPracticeSession } from "@/components/grammar/practice-session";

export const dynamic = "force-dynamic";

export default async function GrammarPracticePage() {
  let cards: ReturnType<typeof grammarCardsFrom> | null = null;
  let errorMessage: string | null = null;
  try {
    const { blocks } = await loadBlocks();
    cards = grammarCardsFrom(blocks);
  } catch (e) {
    errorMessage =
      e instanceof ContentError ? e.message : "Failed to load content.";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6">
        <Link
          href="/grammar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Grammar
        </Link>
      </header>
      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="font-medium text-destructive">Content problem</p>
          <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-muted-foreground">
            {errorMessage}
          </pre>
        </div>
      ) : (
        <GrammarPracticeSession cards={cards!} />
      )}
    </main>
  );
}
