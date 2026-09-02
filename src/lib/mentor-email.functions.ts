import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSessionEmails, type BuiltEmail } from "@/lib/mentor-email";

const schema = z.object({
  sessionId: z.string().uuid(),
  timezone: z.string().max(80).default("UTC"),
  /** "mentor" = booking notice, "mentee" = mentor-confirmed notice. */
  audience: z.enum(["both", "mentee", "mentor"]).default("both"),
});

type SendResult = {
  status: "sent" | "not_configured" | "failed";
  detail: string;
  recipients: { kind: string; to: string | null; subject: string }[];
};

/**
 * Sends the booking confirmation to mentee and/or mentor.
 *
 * Outgoing email needs a verified sending domain plus an API key. When those
 * aren't configured we still build the full email, persist a clear
 * `not_configured` state and never pretend anything was delivered — the app
 * falls back to the in-app confirmation and the .ics download.
 */
export const sendSessionConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<SendResult> => {

    const { data: session, error } = await context.supabase
      .from("mentor_sessions")
      .select("id, mentor_id, starts_at, ends_at, theme, meeting_format")
      .eq("id", data.sessionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return { status: "failed", detail: "Session not found.", recipients: [] };

    const [{ data: mentor }, { data: profile }] = await Promise.all([
      context.supabase
        .from("mentors")
        .select("full_name, title, company, contact_email, city, country, meeting_pref")
        .eq("id", session.mentor_id)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);

    if (!mentor) return { status: "failed", detail: "Mentor not found.", recipients: [] };

    const inPerson = session.meeting_format === "in_person";
    const emails = buildSessionEmails({
      menteeName: profile?.full_name || "Your mentee",
      menteeEmail: profile?.email ?? null,
      mentorName: mentor.full_name,
      mentorEmail: mentor.contact_email ?? null,
      mentorTitle: mentor.title,
      mentorCompany: mentor.company,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      timezone: data.timezone,
      format: session.meeting_format,
      location: inPerson
        ? [mentor.city, mentor.country].filter(Boolean).join(", ") || "To be confirmed"
        : "Online — link to be shared by your mentor",
      purpose: session.theme || "General career mentoring",
      meetingLink: null,
    }).filter((email) => data.audience === "both" || email.kind === data.audience);


    const recipients = emails.map((email) => ({
      kind: email.kind,
      to: email.to,
      subject: email.subject,
    }));

    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["MENTOR_EMAIL_FROM"];

    const persist = async (status: SendResult["status"], detail: string) => {
      await context.supabase
        .from("mentor_sessions")
        .update({
          email_status: status,
          email_detail: detail,
          email_sent_at: status === "sent" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);
    };

    if (!apiKey || !from) {
      const detail =
        "No verified sending domain is configured for this app, so the confirmation email was prepared but not delivered. Your in-app confirmation and calendar file (.ics) are ready now.";
      await persist("not_configured", detail);
      return { status: "not_configured", detail, recipients };
    }

    const send = async (email: BuiltEmail) => {
      if (!email.to) return { ok: false, reason: `No ${email.kind} email address on file.` };
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      if (response.ok) return { ok: true as const, reason: "" };
      const body = await response.text();
      console.error("mentor confirmation email failed", email.kind, response.status, body);
      return { ok: false as const, reason: `${email.kind}: delivery rejected (${response.status})` };
    };

    try {
      const results = await Promise.all(emails.map((email) => send(email)));
      const failed = results.filter((result) => !result.ok);
      if (failed.length === 0) {
        const detail = "Confirmation sent to you and your mentor.";
        await persist("sent", detail);
        return { status: "sent", detail, recipients };
      }
      const detail = `Some confirmations didn't go out — ${failed.map((f) => f.reason).join("; ")}`;
      await persist("failed", detail);
      return { status: "failed", detail, recipients };
    } catch (sendError) {
      console.error("mentor confirmation email error", sendError);
      const detail = "The email service couldn't be reached. Your in-app confirmation still stands.";
      await persist("failed", detail);
      return { status: "failed", detail, recipients };
    }
  });
