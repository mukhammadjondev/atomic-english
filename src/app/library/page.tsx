import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { ContentError } from "@/lib/content/format-error";
import { vocabList } from "@/lib/library/content";
import { LibraryView } from "@/components/library/library-view";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  let words: ReturnType<typeof vocabList> | null = null;
  let errorMessage: string | null = null;
  try {
    const { blocks } = await loadBlocks();
    words = vocabList(blocks);
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
        <h1 className="font-display text-3xl font-semibold">Words</h1>
      </header>
      {errorMessage ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm text-destructive">
          {errorMessage}
        </pre>
      ) : (
        <LibraryView words={words!} />
      )}
    </main>
  );
}
