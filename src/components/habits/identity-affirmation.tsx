import { Sparkles } from "lucide-react";

const AFFIRMATIONS = [
  "You're becoming someone who studies English every day.",
  "Every card is a vote for the person you want to be.",
  "Small steps, repeated, become fluency.",
  "You don't have to be perfect — just consistent.",
  "Showing up today is the whole game. Nice.",
  "Tiny habits, remarkable results.",
];

/** Identity-based affirmation (per Clear) — deterministic per day. */
export function IdentityAffirmation() {
  const i = new Date().getDate() % AFFIRMATIONS.length;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-secondary/40 p-5">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="font-display text-lg leading-snug">{AFFIRMATIONS[i]}</p>
    </div>
  );
}
