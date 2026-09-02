// Live event sourcing for the Network hub.
//
// Same shape as `searchSwissBoards` in job-search.server.ts: Firecrawl through
// the Lovable connector gateway, then an AI pass that turns the scraped page
// text into structured rows. Meetup is deliberately NOT used — their API now
// requires a paid Meetup Pro subscription just to obtain credentials.

import { coordsForLocation } from "@/lib/events";

export type SourcedEvent = {
  external_id: string;
  title: string;
  organizer: string;
  source: string;
  event_type: "hackathon" | "workshop" | "networking" | "women_program" | "conference";
  starts_at: string;
  ends_at: string | null;
  format: "in_person" | "virtual" | "hybrid";
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  cost: "free" | "paid";
  price_text: string | null;
  skill_tags: string[];
  url: string;
  description: string | null;
  cohort_going: number;
  /** False only for events scraped from a real, verifiable listing page. */
  is_example: boolean;
};

/** Curated, verifiable sources. Each one publishes a public events page. */
const SOURCES: { name: string; organizer: string; url: string }[] = [
  {
    name: "Women in Digital Switzerland",
    organizer: "Women in Digital Switzerland",
    url: "https://www.womenindigitalswitzerland.com/events",
  },
  {
    name: "Women in Tech Switzerland",
    organizer: "Women in Tech Switzerland",
    url: "https://www.womenintechswitzerland.com/events",
  },
  {
    name: "WomenTech Network",
    organizer: "WomenTech Network",
    url: "https://www.womentech.net/events",
  },
  { name: "LauzHack", organizer: "LauzHack (EPFL)", url: "https://lauzhack.com/" },
  { name: "SwissHacks", organizer: "SwissHacks", url: "https://www.swisshacks.com/" },
  {
    name: "SwissDevJobs",
    organizer: "Swiss tech community",
    url: "https://swissdevjobs.ch/events",
  },
];


const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function scrapeSource(
  source: { name: string; organizer: string; url: string },
  gatewayKey: string,
  connectionKey: string,
  notes: string[],
): Promise<{ source: typeof SOURCES[number]; markdown: string } | null> {
  try {
    let response: Response | null = null;
    // The connector gateway rate-limits bursts, so back off once on 429/5xx.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`${GATEWAY}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${gatewayKey}`,
          "X-Connection-Api-Key": connectionKey,
        },
        body: JSON.stringify({
          url: source.url,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 2500,
        }),
      });
      if (response.status !== 429 && response.status < 500) break;
      await sleep(4000);
    }
    if (!response || !response.ok) {
      const detail = response ? await response.text() : "no response";
      console.error(`firecrawl scrape failed [${response?.status}] ${source.url}: ${detail}`);
      notes.push(`${source.name} returned ${response?.status ?? "no response"}.`);
      return null;
    }

    const body = (await response.json()) as {
      markdown?: string;
      data?: { markdown?: string };
    };
    const markdown = body.markdown ?? body.data?.markdown ?? "";
    if (!markdown.trim()) {
      notes.push(`${source.name} had no readable listings.`);
      return null;
    }
    return { source, markdown: markdown.slice(0, 12_000) };
  } catch (error) {
    console.error(`firecrawl scrape threw for ${source.url}`, error);
    notes.push(`${source.name} could not be reached.`);
    return null;
  }
}

type ExtractedEvent = {
  title?: string;
  organizer?: string;
  event_type?: string;
  starts_at?: string;
  ends_at?: string | null;
  format?: string;
  city?: string | null;
  country?: string | null;
  cost?: string;
  price_text?: string | null;
  skill_tags?: string[];
  url?: string;
  description?: string | null;
};

const EVENT_TYPES = ["hackathon", "workshop", "networking", "women_program", "conference"] as const;
const FORMATS = ["in_person", "virtual", "hybrid"] as const;

/** Turn one source's scraped page into structured, dated events. */
async function extractEvents(
  page: { source: typeof SOURCES[number]; markdown: string },
  apiKey: string,
  notes: string[],
): Promise<SourcedEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Below is the scraped events page of ${page.source.name} (${page.source.url}).

Extract every UPCOMING event you can actually see on the page. Do not invent anything: if a date is not stated, skip that event. Return strict JSON only:
{"events":[{"title":"","organizer":"","event_type":"hackathon|workshop|networking|women_program|conference","starts_at":"ISO 8601 with timezone","ends_at":"ISO 8601 or null","format":"in_person|virtual|hybrid","city":"or null","country":"ISO-2 code or null","cost":"free|paid","price_text":"or null","skill_tags":["max 5 tech/skill tags"],"url":"absolute link to the event page","description":"one sentence, max 200 chars"}]}
Use "women_program" for events explicitly for women/non-binary people in tech. If there are no dated upcoming events, return {"events":[]}.

PAGE:
${page.markdown}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      console.error(`event extraction failed [${response.status}]`, await response.text());
      notes.push(`Couldn't read ${page.source.name}'s calendar this time.`);
      return [];
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
      events?: ExtractedEvent[];
    };
    return (parsed.events ?? [])
      .map((row) => normalise(row, page.source))
      .filter((row): row is SourcedEvent => row !== null);
  } catch (error) {
    console.error(`event extraction threw for ${page.source.name}`, error);
    notes.push(`Couldn't read ${page.source.name}'s calendar this time.`);
    return [];
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function normalise(row: ExtractedEvent, source: typeof SOURCES[number]): SourcedEvent | null {
  const title = (row.title ?? "").trim();
  const url = (row.url ?? "").trim();
  const startsAt = (row.starts_at ?? "").trim();
  if (!title || !url.startsWith("http") || !startsAt) return null;

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  // Only forward-looking listings; a stale calendar entry is worse than none.
  if (start.getTime() < Date.now() - 6 * 3_600_000) return null;
  if (start.getTime() > Date.now() + 365 * 86_400_000) return null;

  const end = row.ends_at ? new Date(row.ends_at) : null;
  const eventType = (EVENT_TYPES as readonly string[]).includes(row.event_type ?? "")
    ? (row.event_type as SourcedEvent["event_type"])
    : "networking";
  const format = (FORMATS as readonly string[]).includes(row.format ?? "")
    ? (row.format as SourcedEvent["format"])
    : row.city
      ? "in_person"
      : "virtual";

  const city = row.city?.trim() || null;
  const coords = city ? coordsForLocation(city) : null;

  return {
    external_id: `${slug(source.name)}:${slug(`${title}-${startsAt.slice(0, 10)}`)}`,
    title: title.slice(0, 160),
    organizer: (row.organizer?.trim() || source.organizer).slice(0, 120),
    source: source.name,
    event_type: eventType,
    starts_at: start.toISOString(),
    ends_at: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    format,
    city,
    country: row.country?.trim()?.toUpperCase()?.slice(0, 2) || (city ? "CH" : null),
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    cost: row.cost === "paid" ? "paid" : "free",
    price_text: row.price_text?.trim() || null,
    skill_tags: (row.skill_tags ?? []).filter(Boolean).slice(0, 5),
    url,
    description: row.description?.trim()?.slice(0, 300) || null,
    cohort_going: 0,
    is_example: false,
  };
}

export type EventSourcingResult = { events: SourcedEvent[]; sources: string[]; notes: string[] };

/** Scrape every curated source and return de-duplicated, verifiable events. */
export async function sourceEvents(): Promise<EventSourcingResult> {
  const notes: string[] = [];
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!gatewayKey || !connectionKey) {
    notes.push("Live event sourcing is not configured yet.");
    return { events: [], sources: [], notes };
  }

  const pages = (
    await Promise.all(SOURCES.map((s) => scrapeSource(s, gatewayKey, connectionKey, notes)))
  ).filter((p): p is { source: typeof SOURCES[number]; markdown: string } => p !== null);

  const extracted = (
    await Promise.all(pages.map((page) => extractEvents(page, gatewayKey, notes)))
  ).flat();

  const byId = new Map<string, SourcedEvent>();
  for (const event of extracted) {
    if (!byId.has(event.external_id)) byId.set(event.external_id, event);
  }
  const events = [...byId.values()].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return { events, sources: [...new Set(events.map((e) => e.source))], notes };
}
