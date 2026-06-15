import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function systemPrompt(prompt?: string) {
  return [
    "You are a warm, encouraging English speaking coach for an intermediate (B1–B2) learner whose first language is Uzbek.",
    prompt ? `The current speaking task is: "${prompt}".` : "",
    "On each turn:",
    "1. Respond conversationally to keep the dialogue going.",
    "2. Gently correct any grammar or vocabulary mistakes — quote the fix and add a one-line why.",
    "3. Suggest a more natural phrasing when useful.",
    "4. Always end with brief encouragement and a follow-up question.",
    "Keep replies short (under 120 words). Be kind; never overwhelm with corrections.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Speaking practice isn't configured. Add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMessage[]; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m) => m.content?.trim() && (m.role === "user" || m.role === "assistant"),
  );
  if (messages.length === 0) {
    return Response.json({ error: "No message provided." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(body.prompt),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ reply });
  } catch (e) {
    console.error("speaking route error", e);
    return Response.json(
      { error: "The coach is unavailable right now. Try again." },
      { status: 502 },
    );
  }
}
