"use client";

import { type ReactNode, useRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SpeakerButton } from "@/components/shared/speaker-button";
import { cn } from "@/lib/utils";

/** Recursively pull plain text out of a React node (for ✅/❌ detection + TTS). */
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

/** A blockquote example: styled callout + a speaker for the English sentence. */
function ExampleQuote({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLQuoteElement>(null);
  return (
    <blockquote
      ref={ref}
      className="my-4 flex items-start gap-2 rounded-r-xl border-l-4 border-primary/60 bg-secondary/50 py-2 pr-3 pl-4"
    >
      <SpeakerButton
        text={nodeText(children)}
        size="icon-sm"
        label="Hear this example"
        className="mt-0.5 shrink-0"
      />
      <div className="italic [&>p]:my-0">{children}</div>
    </blockquote>
  );
}

function CalloutItem({ children }: { children?: ReactNode }) {
  const text = nodeText(children).trimStart();
  const tone = text.startsWith("✅")
    ? "border-success/30 bg-success/10"
    : text.startsWith("❌")
      ? "border-destructive/30 bg-destructive/10"
      : "";
  if (!tone) return <li className="my-1">{children}</li>;
  return (
    <li className={cn("my-1.5 list-none rounded-lg border px-3 py-1.5", tone)}>
      {children}
    </li>
  );
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-2 mb-3 font-display text-3xl font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2 font-display text-2xl font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-1.5 font-display text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <CalloutItem>{children}</CalloutItem>,
  blockquote: ({ children }) => <ExampleQuote>{children}</ExampleQuote>,
  code: ({ children }) => (
    <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
      {children}
    </code>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a href={href} className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
};

export function MarkdownProse({ markdown }: { markdown: string }) {
  return (
    <div className="text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
