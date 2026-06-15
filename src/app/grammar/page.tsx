import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { ContentError } from "@/lib/content/format-error";
import { grammarTopics } from "@/lib/grammar/content";
import { Badge } from "@/components/ui/badge";
import { GrammarPracticeCta } from "@/components/grammar/practice-cta";

export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  let topics: ReturnType<typeof grammarTopics> = [];
  let errorMessage: string | null = null;
  try {
    const { blocks } = await loadBlocks();
    topics = grammarTopics(blocks);
  } catch (e) {
    errorMessage =
      e instanceof ContentError ? e.message : "Failed to load content.";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-semibold">Grammar</h1>
      </header>

      {errorMessage ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm text-destructive">
          {errorMessage}
        </pre>
      ) : topics.length === 0 ? (
        <p className="text-muted-foreground">No grammar topics yet.</p>
      ) : (
        <div className="space-y-5">
          <GrammarPracticeCta
            cardIds={topics.flatMap((g) => g.exercises.map((e) => e.id))}
          />
          <ul className="grid gap-3 sm:grid-cols-2">
          {topics.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grammar/${g.id}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
                    <BookOpen className="size-4" />
                  </span>
                  {g.cefr && <Badge variant="secondary">{g.cefr}</Badge>}
                </div>
                <h2 className="font-display text-xl font-semibold">{g.topic}</h2>
                <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
                  <span>{g.exercises.length} exercises</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
