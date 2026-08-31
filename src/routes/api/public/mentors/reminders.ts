import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runMentorCheckInReminders } from "@/lib/mentors.functions";

// Scheduled reconnect-reminder job. Point a cron at
// POST /api/public/mentors/reminders with the cron bearer secret.
// Reminders are delivered in-app (no outgoing email is configured).
export const Route = createFileRoute("/api/public/mentors/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const result = await runMentorCheckInReminders();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("mentor reminder sweep failed", error);
          return Response.json({ ok: false, error: "sweep failed" }, { status: 500 });
        }
      },
    },
  },
});
