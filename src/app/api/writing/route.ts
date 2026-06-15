import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

function systemPrompt(targets: string[]) {
  return [
    "You are a warm, encouraging English writing coach for an intermediate (B1–B2) learner whose first language is Uzbek.",
    targets.length
      ? `The learner was asked to use these target words: ${targets.join(", ")}.`
      : "",
    "Reply in Markdown with these sections:",
    "### Corrections — bullet list; quote the original phrase, give the fix, add a one-line why. If it's already correct, say so.",
    "### Natural version — a polished rewrite of their text.",
    "### Encouragement — one or two warm sentences; note which target words they used well.",
    "Be kind and concise. Don't overwhelm — focus on the few most useful fixes.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Writing practice isn't configured. Add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let body: { text?: string; targetWords?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: "Write something first." }, { status: 400 });
  }
  const targets = (body.targetWords ?? []).filter(Boolean).slice(0, 20);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(targets),
      messages: [{ role: "user", content: text }],
    });
    const feedback = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ feedback });
  } catch (e) {
    console.error("writing route error", e);
    return Response.json(
      { error: "The coach is unavailable right now. Try again." },
      { status: 502 },
    );
  }
}
