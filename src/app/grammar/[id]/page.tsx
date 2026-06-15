import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { findGrammarTopic } from "@/lib/grammar/content";
import { Badge } from "@/components/ui/badge";
import { MarkdownProse } from "@/components/shared/markdown-prose";
import { ExerciseCard } from "@/components/grammar/exercise-card";

export const dynamic = "force-dynamic";

export default async function GrammarTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { blocks } = await loadBlocks();
  const topic = findGrammarTopic(blocks, id);
  if (!topic) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 space-y-3">
        <Link
          href="/grammar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Grammar
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {topic.cefr && <Badge variant="secondary">{topic.cefr}</Badge>}
          {topic.tags?.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      <article className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <MarkdownProse markdown={topic.explanationMd} />
      </article>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-semibold">Practice</h2>
        {topic.exercises.map((ex, i) => (
          <ExerciseCard key={ex.id} exercise={ex} index={i + 1} topicId={topic.id} />
        ))}
      </section>
    </main>
  );
}
