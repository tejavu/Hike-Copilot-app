import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const prepSchema = z.object({
  mentorName: z.string().max(120),
  mentorTitle: z.string().max(200),
  mentorExpertise: z.array(z.string().max(60)).max(12).default([]),
  goal: z.string().max(400).default(""),
  targetRole: z.string().max(200).default(""),
  prioritySkills: z.array(z.string().max(60)).max(12).default([]),
  builds: z.array(z.string().max(200)).max(8).default([]),
  certifications: z.array(z.string().max(200)).max(8).default([]),
  eventTakeaways: z.array(z.string().max(300)).max(6).default([]),
  sessionFocus: z.string().max(300).default(""),
});

const SYSTEM = `You are Ada, a warm, encouraging career coach for women in tech.
You prepare a woman for a 1:1 mentoring session. Write in her voice — first person, direct, human.
Questions must be specific to her situation and to this mentor's expertise; never generic ("what advice do you have?").
Never invent achievements she does not have. Never claim she is proficient at something she is still learning.
Return STRICT JSON only, no markdown, in the shape:
{"agenda":"short numbered agenda with minute estimates","questions":["6 questions in her voice"]}`;

export const generateMentorPrep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => prepSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, reason: "unavailable" };

    const context = [
      `Mentor: ${data.mentorName}, ${data.mentorTitle}. Expertise: ${data.mentorExpertise.join(", ") || "unknown"}.`,
      `Her goal: ${data.goal || "not stated"}.`,
      `Target role: ${data.targetRole || "not stated"}.`,
      `Priority skill gaps from her roadmap: ${data.prioritySkills.join(", ") || "none recorded"}.`,
      `Projects she has built: ${data.builds.join("; ") || "none yet"}.`,
      `Certifications completed: ${data.certifications.join("; ") || "none yet"}.`,
      `Recent community-event takeaways: ${data.eventTakeaways.join("; ") || "none"}.`,
      `What she wants from this session: ${data.sessionFocus || "not stated"}.`,
    ].join("\n");

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `${context}\n\nWrite her agenda and questions as JSON.` },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("mentor prep gateway error", response.status, body);
        if (response.status === 429) return { ok: false as const, reason: "rate_limited" };
        if (response.status === 402 || response.status === 403) {
          return { ok: false as const, reason: "no_credits" };
        }
        return { ok: false as const, reason: "error" };
      }

      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim()) as {
        agenda?: unknown;
        questions?: unknown;
      };
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions.filter((q): q is string => typeof q === "string" && q.length > 8).slice(0, 8)
        : [];
      const agenda = typeof parsed.agenda === "string" ? parsed.agenda : "";
      if (!questions.length || !agenda) return { ok: false as const, reason: "error" };
      return { ok: true as const, agenda, questions };
    } catch (error) {
      console.error("mentor prep failed", error);
      return { ok: false as const, reason: "error" };
    }
  });

/**
 * Scheduled reconnect reminders.
 *
 * Reminders are delivered IN-APP: this job flags every mentee whose next
 * check-in date has passed so Mentor Match can surface a gentle nudge. No email
 * is sent — outgoing email needs a verified sending domain, which is not
 * configured for this project.
 */
export const runMentorCheckInReminders = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("mentor_preferences")
    .update({ reminder_pending: true, updated_at: new Date().toISOString() })
    .neq("reminder_cadence", "off")
    .not("next_check_in_at", "is", null)
    .lte("next_check_in_at", new Date().toISOString())
    .eq("reminder_pending", false)
    .select("user_id");
  if (error) throw error;
  return { flagged: (data ?? []).length, delivery: "in_app" as const };
});
