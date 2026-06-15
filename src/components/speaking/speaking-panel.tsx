"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpeakerButton } from "@/components/shared/speaker-button";
import { cn } from "@/lib/utils";
import type { Speaking } from "@/lib/content/schema";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function SpeakingPanel({ prompts }: { prompts: Speaking[] }) {
  const [active, setActive] = useState(prompts[0]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  function switchPrompt(p: Speaking) {
    setActive(p);
    setMessages([]);
    setError(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, prompt: active?.promptEn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      requestAnimationFrame(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!active) {
    return <p className="text-muted-foreground">No speaking prompts yet.</p>;
  }

  return (
    <div className="space-y-4">
      {prompts.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchPrompt(p)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                p.id === active.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              Prompt {prompts.indexOf(p) + 1}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-primary/20 bg-secondary/40 p-5">
        <div className="flex items-start gap-2">
          <SpeakerButton text={active.promptEn} size="icon-sm" className="-ml-2" />
          <div>
            <p className="font-display text-lg">{active.promptEn}</p>
            <p className="text-sm text-muted-foreground">{active.promptUz}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card",
              )}
            >
              {m.role === "assistant" && (
                <SpeakerButton
                  text={m.content}
                  size="icon-sm"
                  className="float-right -mt-1 -mr-2"
                />
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-muted-foreground">Coach is thinking…</p>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Answer in English…"
          aria-label="Your reply"
          className="h-12"
          disabled={loading}
        />
        <Button type="submit" size="lg" className="h-12 px-5" disabled={loading}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
