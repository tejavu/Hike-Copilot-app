import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * The seeded volunteer directory skews software/data/product. When nobody in it
 * is a plausible fit for a mentee's actual field (hardware, embedded, FPGA,
 * bioinformatics…), we generate one or two clearly-fictional demo mentors in her
 * field and persist them, so the pool broadens over time instead of
 * regenerating near-identical people for every similar profile.
 */
const schema = z.object({
  prioritySkills: z.array(z.string().max(60)).max(12).default([]),
  targetRole: z.string().max(120).nullable().default(null),
  language: z.string().max(40).nullable().default(null),
  city: z.string().max(80).nullable().default(null),
  bestScore: z.number().min(0).max(100).default(0),
  /** Ask explicitly (from the empty state) — bypasses the score threshold. */
  force: z.boolean().default(false),
});

/** Below this, the strongest real match isn't credible for her field. */
export const MENTOR_GAP_THRESHOLD = 45;

const slotSchema = z.object({
  dow: z.number().int().min(0).max(6),
  hour: z.number().int().min(6).max(21),
  minutes: z.union([z.literal(45), z.literal(60)]),
});

const generatedSchema = z.object({
  mentors: z
    .array(
      z.object({
        full_name: z.string().min(3).max(60),
        title: z.string().min(3).max(80),
        company: z.string().min(2).max(60),
        bio: z.string().min(40).max(600),
        expertise: z.array(z.string().max(60)).min(3).max(8),
        role_track: z.string().max(60),
        seniority: z.string().max(30),
        languages: z.array(z.string().max(30)).min(1).max(3),
        city: z.string().max(60).nullable(),
        country: z.string().max(4).nullable(),
        meeting_pref: z.enum(["remote", "in_person", "either"]),
        availability_summary: z.string().max(120),
        topics: z.array(z.string().max(60)).min(2).max(6),
        years_experience: z.number().int().min(4).max(30),
        slots: z.array(slotSchema).min(2).max(6),
      }),
    )
    .min(1)
    .max(3),
});

export const generateGapMentors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<{ created: number }> => {
    if (!data.force && data.bestScore >= MENTOR_GAP_THRESHOLD) return { created: 0 };
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { created: 0 };

    const prompt = [
      "Create 2-3 clearly fictional volunteer mentor profiles for a women-in-tech mentoring app.",
      `The mentee is working toward: ${data.targetRole || "an unspecified tech role"}.`,
      `Her priority skills: ${data.prioritySkills.join(", ") || "unspecified"}.`,
      data.language ? `She prefers mentoring in ${data.language}.` : "",
      data.city ? `She is based near ${data.city}, Switzerland.` : "Base them in Switzerland.",
      "Rules: invented individuals only — never imply a real, verifiable person, never name a specific real company's internal team, never claim awards, patents or verifiable credentials.",
      "Use ordinary, well-known employer names or generic ones (e.g. 'a Swiss medtech firm').",
      "expertise must use the plain skill vocabulary a matcher would compare against her skills (e.g. 'FPGA', 'VHDL', 'Embedded C', 'PCB Design').",
      "slots: weekly recurring availability, dow 0=Sunday..6=Saturday, hour 6-21 local, minutes 45 or 60.",
      "Return strict JSON: {\"mentors\":[{full_name,title,company,bio,expertise,role_track,seniority,languages,city,country,meeting_pref,availability_summary,topics,years_experience,slots}]}",
    ]
      .filter(Boolean)
      .join("\n");

    let parsed: z.infer<typeof generatedSchema>;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: [
            {
              role: "system",
              content:
                "You invent transparent demo mentor profiles. Output strict JSON only, no prose, no markdown fences.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!response.ok) {
        console.error("mentor generation failed", response.status, await response.text());
        return { created: 0 };
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      parsed = generatedSchema.parse(JSON.parse(json));
    } catch (error) {
      console.error("mentor generation error", error);
      return { created: 0 };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const rows = parsed.mentors.map((mentor) => ({
      external_id: `demo:gen-${slug(mentor.full_name)}-${slug(mentor.role_track).slice(0, 20)}`,
      full_name: mentor.full_name,
      title: mentor.title,
      company: mentor.company,
      bio: mentor.bio,
      expertise: mentor.expertise,
      role_track: mentor.role_track,
      seniority: mentor.seniority,
      languages: mentor.languages,
      city: mentor.city,
      country: mentor.country ?? "CH",
      meeting_pref: mentor.meeting_pref,
      availability_summary: mentor.availability_summary,
      topics: mentor.topics,
      community: null,
      years_experience: mentor.years_experience,
      slots: mentor.slots,
      is_demo: true,
      contact_email: null,
    }));

    const { error } = await supabaseAdmin
      .from("mentors")
      .upsert(rows as never, { onConflict: "external_id", ignoreDuplicates: true });
    if (error) {
      console.error("mentor generation insert failed", error);
      return { created: 0 };
    }
    return { created: rows.length };
  });
