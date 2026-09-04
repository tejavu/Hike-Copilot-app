import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  field: z.enum(["interests", "skills", "education", "experience", "certifications", "projects"]),
  text: z.string().min(1).max(4000),
});

const GUIDE: Record<string, string> = {
  interests:
    "Return short canonical tech interest areas (e.g. 'Cloud', 'Frontend Engineering', 'Data Analysis'). Strip filler words like 'I like', 'the', 'a bit of'.",
  skills:
    "Return canonical skill/tool/language names as a recruiter would write them (e.g. 'Cloud' -> 'Cloud Computing', 'i know some python' -> 'Python', 'react.js' -> 'React'). No sentences, no verbs, no first person.",
  education:
    "Return each education entry as a tidy line: 'Degree, Field — Institution (year)' when known. Keep only what's stated.",
  experience:
    "Return each role as a tidy line: 'Title — Company (period)' when known. Keep only what's stated.",
  certifications: "Return official certification/course names only, properly capitalised.",
  projects:
    "Return each project as a tidy line: 'Title — one line on what it did or achieved (dates if given)'. Keep only what's stated.",
};

export const normaliseAnswer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { items: null as string[] | null };

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            {
              role: "system",
              content: `You clean up messy free-text career answers into a structured list. ${GUIDE[data.field]}
Rules: never invent anything the user did not say; drop pleasantries and self-deprecation; merge duplicates; at most 10 items.
Reply with ONLY a JSON object: {"items": ["..."]}. If the answer says none/nothing, return {"items": []}.`,
            },
            { role: "user", content: data.text },
          ],
        }),
      });

      if (!response.ok) {
        console.error("normaliseAnswer gateway error", response.status, await response.text());
        return { items: null };
      }

      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = z.object({ items: z.array(z.string()).max(12) }).parse(JSON.parse(json));
      return { items: parsed.items.map((i) => i.trim()).filter(Boolean) };
    } catch (error) {
      console.error("normaliseAnswer failed", error);
      return { items: null };
    }
  });
