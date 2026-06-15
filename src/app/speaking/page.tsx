import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { loadBlocks } from "@/lib/content/loader";
import { ContentError } from "@/lib/content/format-error";
import { speakingPrompts } from "@/lib/speaking/content";
import { SpeakingPanel } from "@/components/speaking/speaking-panel";

export const dynamic = "force-dynamic";

export default async function SpeakingPage() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);

  let prompts: ReturnType<typeof speakingPrompts> | null = null;
  let errorMessage: string | null = null;
  try {
    const { blocks } = await loadBlocks();
    prompts = speakingPrompts(blocks);
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
        <h1 className="font-display text-3xl font-semibold">Speaking</h1>
      </header>

      {!configured && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          The Claude coach is optional. Add <code className="mx-1">ANTHROPIC_API_KEY</code>{" "}
          to your environment to enable live feedback.
        </p>
      )}

      {errorMessage ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm text-destructive">
          {errorMessage}
        </pre>
      ) : (
        <SpeakingPanel prompts={prompts!} />
      )}
    </main>
  );
}
