import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildMentorRequestEmail } from "@/lib/mentor-email";

/**
 * Every mentor-bound email is redirected to one inbox while the volunteer
 * directory is still a demo pool. The mentor record keeps its real address —
 * only the delivery address is overridden here, at send time.
 */
export const MENTOR_EMAIL_REDIRECT =
  process.env["MENTOR_EMAIL_REDIRECT"] ?? "tejes478@gmail.com";

export function appUrl(): string {
  return (
    process.env["PUBLIC_APP_URL"] ??
    process.env["VITE_PUBLIC_APP_URL"] ??
    "https://tech-ascend-buddy.lovable.app"
  );
}

export type MentorRequestResult = {
  status: "sent" | "not_configured" | "failed";
  detail: string;
};

const schema = z.object({
  mentorId: z.string().uuid(),
  score: z.number().min(0).max(100).default(0),
  reasons: z.array(z.string().max(300)).max(6).default([]),
  matchedAttributes: z.array(z.string().max(80)).max(10).default([]),
});

/**
 * Puts the match into `pending_mentor` and asks the mentor, by email, whether
 * she'll take it on. Scheduling stays locked until she answers.
 */
export const requestMentorMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<MentorRequestResult> => {
    const now = new Date().toISOString();

    const { error: upsertError } = await context.supabase.from("mentor_matches").upsert(
      {
        user_id: context.userId,
        mentor_id: data.mentorId,
        status: "pending_mentor",
        score: data.score,
        reasons: data.reasons,
        matched_attributes: data.matchedAttributes,
        requested_at: now,
        responded_at: null,
        updated_at: now,
      } as never,
      { onConflict: "user_id,mentor_id" },
    );
    if (upsertError) throw upsertError;

    const [{ data: match }, { data: mentor }, { data: profile }, { data: prefs }] =
      await Promise.all([
        context.supabase
          .from("mentor_matches")
          .select("request_token")
          .eq("user_id", context.userId)
          .eq("mentor_id", data.mentorId)
          .maybeSingle(),
        context.supabase
          .from("mentors")
          .select("full_name, meeting_pref")
          .eq("id", data.mentorId)
          .maybeSingle(),
        context.supabase
          .from("profiles")
          .select("full_name")
          .eq("id", context.userId)
          .maybeSingle(),
        context.supabase
          .from("mentor_preferences")
          .select(
            "goal, target_role, mentorship_topics, session_focus, language, location_pref, priority_skills",
          )
          .eq("user_id", context.userId)
          .maybeSingle(),
      ]);

    if (!mentor || !match?.request_token) {
      return { status: "failed", detail: "I couldn't prepare that request. Try again?" };
    }

    const base = `${appUrl()}/api/public/mentors/respond?token=${match.request_token}`;
    const email = buildMentorRequestEmail({
      mentorName: mentor.full_name,
      menteeName: profile?.full_name || "A Hike Copilot mentee",
      goal: prefs?.goal ?? null,
      targetRole: prefs?.target_role ?? null,
      mentorshipTopics: prefs?.mentorship_topics ?? [],
      sessionFocus: prefs?.session_focus ?? null,
      language: prefs?.language ?? null,
      meetingPref: prefs?.location_pref ?? mentor.meeting_pref,
      prioritySkills: prefs?.priority_skills ?? [],
      acceptUrl: `${base}&action=accept`,
      declineUrl: `${base}&action=decline`,
    });

    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["MENTOR_EMAIL_FROM"];
    if (!apiKey || !from) {
      return {
        status: "not_configured",
        detail:
          "Your request is saved, but no verified sending domain is set up for this app yet, so the email to your mentor hasn't gone out.",
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from,
          to: [MENTOR_EMAIL_REDIRECT],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      if (!response.ok) {
        console.error("mentor request email failed", response.status, await response.text());
        return {
          status: "failed",
          detail: "Your request is saved, but the email to your mentor didn't go out.",
        };
      }
      return { status: "sent", detail: "Your request is with your mentor." };
    } catch (error) {
      console.error("mentor request email error", error);
      return {
        status: "failed",
        detail: "Your request is saved, but the email service couldn't be reached.",
      };
    }
  });
