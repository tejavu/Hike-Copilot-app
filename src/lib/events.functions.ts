import { createServerFn } from "@tanstack/react-start";
import { SEED_EVENTS } from "@/lib/event-seed";

/**
 * Ingestion layer for the Network hub.
 *
 * Real sourcing runs first: Firecrawl scrapes a curated set of verifiable
 * calendars (Women In Digital Switzerland, Women in Tech Switzerland,
 * WomenTech Network, LauzHack, SwissHacks, SwissDevJobs' Swiss tech events),
 * and an AI pass turns each page into dated rows. Those go in with
 * `is_example: false`.
 *
 * The curated illustrative catalog is only used to keep the board from being
 * empty, and every one of those rows is flagged `is_example: true` so the UI
 * can label it as an example rather than pass it off as a live listing.
 *
 * Meetup's API is deliberately not used: it now requires a paid Meetup Pro
 * subscription just to obtain credentials.
 */
export const refreshEvents = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sourceEvents } = await import("@/lib/event-search.server");
  const stamp = new Date().toISOString();

  const live = await sourceEvents();

  const liveRows = live.events.map((event) => ({
    external_id: event.external_id,
    title: event.title,
    organizer: event.organizer,
    source: event.source,
    event_type: event.event_type,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    format: event.format,
    city: event.city,
    country: event.country,
    lat: event.lat,
    lng: event.lng,
    cost: event.cost,
    price_text: event.price_text,
    skill_tags: event.skill_tags,
    url: event.url,
    description: event.description,
    cohort_going: event.cohort_going,
    is_example: false,
    last_seen_at: stamp,
    updated_at: stamp,
  }));

  // Illustrative fallback — clearly labelled, never presented as a live listing.
  const now = Date.now();
  const exampleRows = SEED_EVENTS.map((seed) => {
    const start = new Date(now + seed.day_offset * 86_400_000);
    start.setUTCHours(seed.start_hour, 0, 0, 0);
    const end = new Date(start.getTime() + seed.duration_hours * 3_600_000);
    return {
      external_id: seed.external_id,
      title: seed.title,
      organizer: seed.organizer,
      source: "Example listing",
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
      is_example: true,
      last_seen_at: stamp,
      updated_at: stamp,
    };
  });

  const rows = [...liveRows, ...exampleRows];
  const { error } = await supabaseAdmin.from("events").upsert(rows, { onConflict: "external_id" });
  if (error) throw error;

  return {
    ingested: rows.length,
    live: liveRows.length,
    examples: exampleRows.length,
    sources: live.sources,
    notes: live.notes,
  };
});
