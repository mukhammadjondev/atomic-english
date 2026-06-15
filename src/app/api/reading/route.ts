import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

function systemPrompt(words: string[]) {
  return [
    "You are an English reading-material writer for an intermediate (B1–B2) learner whose first language is Uzbek.",
    "Write a short, natural passage (around 120–160 words) that a learner can understand — comprehensible input.",
    words.length
      ? `Weave in as many of these words as read naturally: ${words.join(", ")}. Don't force every one.`
      : "",
    "Reply in Markdown: a short '## Title', then the passage in 1–2 paragraphs.",
    "Keep sentences clear and not too long. Avoid rare idioms.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Reading practice isn't configured. Add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let body: { words?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const words = (body.words ?? []).filter(Boolean).slice(0, 25);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt(words),
      messages: [
        {
          role: "user",
          content: "Write today's reading passage using my words.",
        },
      ],
    });
    const passage = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ passage });
  } catch (e) {
    console.error("reading route error", e);
    return Response.json(
      { error: "Reading practice is unavailable right now. Try again." },
      { status: 502 },
    );
  }
}
