import { createServerFn } from "@tanstack/react-start";
import { SEED_EVENTS } from "@/lib/event-seed";

/**
 * Ingestion layer for the Network hub.
 *
 * Today this upserts our curated seed catalog (with real source attribution) and
 * rolls each event's date forward so the board is never stale. Each source block
 * in `event-seed.ts` is a stand-in for a connector: when Meetup / Eventbrite /
 * LinkedIn / Devpost credentials are configured, fetch that source here and push
 * the normalised rows through the same upsert — nothing else has to change.
 */
export const refreshEvents = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();

  const rows = SEED_EVENTS.map((seed) => {
    const start = new Date(now + seed.day_offset * 86_400_000);
    start.setUTCHours(seed.start_hour, 0, 0, 0);
    const end = new Date(start.getTime() + seed.duration_hours * 3_600_000);
    return {
      external_id: seed.external_id,
      title: seed.title,
      organizer: seed.organizer,
      source: seed.source,
      event_type: seed.event_type,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      format: seed.format,
      city: seed.city,
      country: seed.country,
      lat: seed.lat,
      lng: seed.lng,
      cost: seed.cost,
      price_text: seed.price_text,
      skill_tags: seed.skill_tags,
      url: seed.url,
      description: seed.description,
      cohort_going: seed.cohort_going,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabaseAdmin.from("events").upsert(rows, { onConflict: "external_id" });
  if (error) throw error;

  return { ingested: rows.length, sources: [...new Set(rows.map((r) => r.source))] };
});
