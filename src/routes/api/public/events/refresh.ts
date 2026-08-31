import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { refreshEvents } from "@/lib/events.functions";

// Scheduled ingestion endpoint. Point a cron job at
// POST /api/public/events/refresh with the cron bearer secret to re-ingest and
// roll the event calendar forward.
export const Route = createFileRoute("/api/public/events/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        try {
          const result = await refreshEvents();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("event ingestion failed", error);
          return Response.json({ ok: false, error: "ingestion failed" }, { status: 500 });
        }
      },
    },
  },
});
