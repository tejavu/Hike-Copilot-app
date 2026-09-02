import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  goal: z.string().max(600).default(""),
  months: z.number().min(1).max(60),
  gaps: z.array(z.string().max(80)).max(10).default([]),
  roles: z.array(z.string().max(120)).max(10).default([]),
  phases: z
    .array(z.object({ kind: z.string(), name: z.string(), blurb: z.string() }))
    .min(1)
    .max(6),
});

export type RoadmapCopy = {
  phases: { kind: string; name: string; blurb: string }[];
  skills: Record<string, string>;
};

export const writeRoadmapCopy = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<{ copy: RoadmapCopy | null }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { copy: null };

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            {
              role: "system",
              content: `You write the headings for a personalised career roadmap. Warm, specific, coach-like — never corporate HR, never clichés like "unlock your potential".
For each phase you are given, write a heading (max 6 words) and a one-sentence blurb (max 22 words) that reflects HER goal, timeline and the roles she liked. Keep the phase order and kinds exactly as given.
Also rewrite each skill gap as a clean, human skill heading (max 5 words, no verbs, no first person, no filler like "the" or "I like") — e.g. "the cloud" -> "Cloud Fundamentals".
Reply with ONLY JSON: {"phases":[{"kind":"...","name":"...","blurb":"..."}],"skills":{"<original gap>":"<heading>"}}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                goal: data.goal,
                timeline_months: data.months,
                target_roles: data.roles,
                skill_gaps: data.gaps,
                phases: data.phases,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("writeRoadmapCopy gateway error", response.status, await response.text());
        return { copy: null };
      }

      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = z
        .object({
          phases: z.array(z.object({ kind: z.string(), name: z.string(), blurb: z.string() })),
          skills: z.record(z.string(), z.string()).default({}),
        })
        .parse(JSON.parse(json));
      return { copy: parsed };
    } catch (error) {
      console.error("writeRoadmapCopy failed", error);
      return { copy: null };
    }
  });
