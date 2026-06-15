import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProgressView } from "@/components/progress/progress-view";

export default function ProgressPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="font-display text-3xl font-semibold">Progress</h1>
      </header>
      <ProgressView />
    </main>
  );
}
