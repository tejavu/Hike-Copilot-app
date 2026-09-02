import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  question: z.string().min(1).max(4000),
  context: z.string().max(4000).default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});

const SYSTEM = `You are Hike Copilot, a warm, encouraging career coach for women in tech.
You talk like a trusted mentor who has been in the industry: direct, specific, generous with belief in her.
Never sound like corporate HR or a clinical assessment tool. No bullet-point lectures unless she asks for a list.
Keep answers under 130 words. Reference her profile and roadmap when it's relevant.
When she doubts herself, name the evidence of her progress instead of empty cheerleading.`;

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { reply: "I can't reach my brain right now, but I'm still here. Try again in a moment?" };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          ...(data.context ? [{ role: "system", content: `Her profile & progress:\n${data.context}` }] : []),
          ...data.history,
          { role: "user", content: data.question },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("AI gateway error", response.status, body);
      if (response.status === 429) {
        return { reply: "Lots of people are talking to me at once — give me a few seconds and ask again?" };
      }
      if (response.status === 402 || response.status === 403) {
        return {
          reply:
            "My chat credits have run out for now, so I can't answer freely — but your roadmap and progress are all still here.",
        };
      }
      return { reply: "Something went sideways on my end. Ask me again?" };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      reply:
        payload.choices?.[0]?.message?.content?.trim() ??
        "I lost my train of thought there — say that again?",
    };
  });
