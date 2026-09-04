import { createFileRoute } from "@tanstack/react-router";
import { buildMentorReadyEmail } from "@/lib/mentor-email";
import { appUrl } from "@/lib/mentor-request.functions";

// Public accept/decline endpoint for the links in the mentor request email.
// Mentors are not app users, so this route is deliberately unauthenticated —
// the single-use-style request token in the link is the credential.

function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f5f6fa;font-family:'Segoe UI',system-ui,sans-serif;">
<div style="max-width:520px;margin:64px auto;background:#fff;border:1px solid #e3e6f0;border-radius:20px;padding:32px;">
<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0f6cbd;font-weight:700;margin:0;">Hike Copilot · Mentor Match</p>
<h1 style="font-size:24px;color:#1b1b25;margin:12px 0 0;">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#3c3c4a;">${body}</p>
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function respond(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");
  if (!token || (action !== "accept" && action !== "decline")) {
    return page("That link isn't complete", "Please use one of the buttons in the email.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: match, error } = await supabaseAdmin
    .from("mentor_matches")
    .select("id, user_id, mentor_id, status, responded_at")
    .eq("request_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!match) {
    return page("We couldn't find that request", "The link may have expired or already been used.");
  }

  const { data: mentor } = await supabaseAdmin
    .from("mentors")
    .select("full_name, title, company, availability_summary")
    .eq("id", match.mentor_id)
    .maybeSingle();
  const mentorName = mentor?.full_name ?? "Your mentor";

  if (match.status === "selected" || match.status === "declined") {
    return page(
      "You've already answered this one",
      match.status === "selected"
        ? `You accepted this request. ${mentorName.split(" ")[0]}, thank you — she can book time with you now.`
        : "You declined this request, and she's been matched with someone else. Nothing more to do.",
    );
  }

  const now = new Date().toISOString();

  if (action === "decline") {
    await supabaseAdmin
      .from("mentor_matches")
      .update({ status: "declined", responded_at: now, updated_at: now })
      .eq("id", match.id);
    return page(
      "Thank you for letting us know",
      "We've told her you're not available right now, and she can request a different mentor straight away. No further action needed.",
    );
  }

  await supabaseAdmin
    .from("mentor_matches")
    .update({ status: "selected", responded_at: now, updated_at: now })
    .eq("id", match.id);
  await supabaseAdmin.from("mentor_preferences").upsert(
    { user_id: match.user_id, selected_mentor_id: match.mentor_id, updated_at: now } as never,
    { onConflict: "user_id" },
  );

  // Tell the mentee her mentor is ready. Session-confirmation email is separate
  // and still goes out when she actually books a slot.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", match.user_id)
    .maybeSingle();

  const { sendEmail, emailConfigured } = await import("@/lib/email-send.server");
  if (emailConfigured() && profile?.email) {
    const email = buildMentorReadyEmail({
      menteeName: profile.full_name || "there",
      mentorName,
      mentorTitle: mentor?.title ?? "",
      mentorCompany: mentor?.company ?? "",
      availabilitySummary: mentor?.availability_summary ?? "Shared in the app",
      appUrl: `${appUrl()}/mentor-match`,
    });
    try {
      await sendEmail({
        to: profile.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    } catch (sendError) {
      console.error("mentor ready email error", sendError);
    }
  }

  return page(
    "Thank you — she'll be delighted",
    "We've let her know you accepted, and she can now book a session from your published availability (at least a week ahead). You'll get the session details by email once she picks a time.",
  );
}

export const Route = createFileRoute("/api/public/mentors/respond")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await respond(request);
        } catch (error) {
          console.error("mentor respond failed", error);
          return page("Something went wrong", "Please try the link again in a moment.");
        }
      },
      POST: async ({ request }) => {
        try {
          return await respond(request);
        } catch (error) {
          console.error("mentor respond failed", error);
          return page("Something went wrong", "Please try the link again in a moment.");
        }
      },
    },
  },
});
