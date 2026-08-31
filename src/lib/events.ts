// Domain types + pure helpers for the Network event hub.

export type EventType = "hackathon" | "workshop" | "networking" | "women_program" | "conference";
export type EventFormat = "in_person" | "virtual" | "hybrid";
export type RsvpStatus = "none" | "interested" | "going";

export type NetworkEvent = {
  id: string;
  external_id: string;
  title: string;
  organizer: string;
  source: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  format: EventFormat;
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
};

export type EventEngagement = {
  event_id: string;
  saved: boolean;
  rsvp_status: RsvpStatus;
};

export type EventReflection = {
  id: string;
  event_id: string;
  attended: boolean;
  contacts: string[];
  takeaway: string | null;
  rating: number | null;
  created_at: string;
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  hackathon: "Hackathon",
  workshop: "Workshop",
  networking: "Networking mixer",
  women_program: "Women-specific program",
  conference: "Conference",
};

export const FORMAT_LABELS: Record<EventFormat, string> = {
  in_person: "In person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

/* ---------------------------------- geo ---------------------------------- */

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  zurich: { lat: 47.3769, lng: 8.5417 },
  zürich: { lat: 47.3769, lng: 8.5417 },
  basel: { lat: 47.5596, lng: 7.5886 },
  bern: { lat: 46.948, lng: 7.4474 },
  geneva: { lat: 46.2044, lng: 6.1432 },
  genève: { lat: 46.2044, lng: 6.1432 },
  lausanne: { lat: 46.5197, lng: 6.6323 },
  lucerne: { lat: 47.0502, lng: 8.3093 },
  "st. gallen": { lat: 47.4245, lng: 9.3767 },
  winterthur: { lat: 47.5001, lng: 8.7501 },
  lugano: { lat: 46.0037, lng: 8.9511 },
  zug: { lat: 47.1662, lng: 8.5155 },
  berlin: { lat: 52.52, lng: 13.405 },
  munich: { lat: 48.1351, lng: 11.582 },
  münchen: { lat: 48.1351, lng: 11.582 },
  hamburg: { lat: 53.5511, lng: 9.9937 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  london: { lat: 51.5072, lng: -0.1276 },
  paris: { lat: 48.8566, lng: 2.3522 },
  vienna: { lat: 48.2082, lng: 16.3738 },
  milan: { lat: 45.4642, lng: 9.19 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
};

/** Best-effort coordinates from a free-text profile location like "Zurich, CH (hybrid)". */
export function coordsForLocation(location: string | null | undefined) {
  if (!location) return null;
  const needle = location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (needle.includes(city)) return { city, ...coords };
  }
  return null;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number | null; lng: number | null },
): number | null {
  if (b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/* -------------------------------- matching -------------------------------- */

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]/g, "");

export type Relevance = {
  score: number;
  matchedSkills: string[];
  reason: string | null;
  distance: number | null;
};

export function scoreEvent(
  event: NetworkEvent,
  opts: { gapSkills: string[]; haveSkills: string[]; home: { lat: number; lng: number } | null },
): Relevance {
  const gap = new Set(opts.gapSkills.map(norm));
  const have = new Set(opts.haveSkills.map(norm));
  const matchedSkills = event.skill_tags.filter((tag) => gap.has(norm(tag)));
  const familiar = event.skill_tags.filter((tag) => have.has(norm(tag)));

  let score = 0;
  score += matchedSkills.length * 40;
  score += familiar.length * 8;
  if (event.event_type === "women_program") score += 12;

  const distance = opts.home ? distanceKm(opts.home, event) : null;
  if (distance != null) score += Math.max(0, 30 - distance / 12);
  else if (event.format === "virtual") score += 10;

  const days = (new Date(event.starts_at).getTime() - Date.now()) / 86_400_000;
  if (days >= 0) score += Math.max(0, 14 - days / 4);

  let reason: string | null = null;
  if (matchedSkills.length > 0) {
    reason = `Matches your ${matchedSkills.slice(0, 2).join(" & ")} roadmap`;
  } else if (event.event_type === "women_program") {
    reason = "A women-in-tech program worth your evening";
  } else if (familiar.length > 0) {
    reason = `Keeps your ${familiar[0]} sharp`;
  } else if (distance != null && distance <= 25) {
    reason = "Happening right on your doorstep";
  }

  return { score: Math.round(score), matchedSkills, reason, distance };
}

/* --------------------------------- filters -------------------------------- */

export type SortKey = "relevance" | "date" | "proximity";

export type Filters = {
  types: EventType[];
  formats: EventFormat[];
  cost: "any" | "free" | "paid";
  withinDays: number | null;
  sort: SortKey;
};

export const DEFAULT_FILTERS: Filters = {
  types: [],
  formats: [],
  cost: "any",
  withinDays: null,
  sort: "relevance",
};

export function activeFilterCount(f: Filters): number {
  return (
    f.types.length +
    f.formats.length +
    (f.cost === "any" ? 0 : 1) +
    (f.withinDays == null ? 0 : 1)
  );
}

export function applyFilters(
  rows: { event: NetworkEvent; relevance: Relevance }[],
  f: Filters,
): { event: NetworkEvent; relevance: Relevance }[] {
  const cutoff = f.withinDays == null ? null : Date.now() + f.withinDays * 86_400_000;

  const filtered = rows.filter(({ event }) => {
    if (f.types.length && !f.types.includes(event.event_type)) return false;
    if (f.formats.length && !f.formats.includes(event.format)) return false;
    if (f.cost !== "any" && event.cost !== f.cost) return false;
    if (cutoff != null && new Date(event.starts_at).getTime() > cutoff) return false;
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (f.sort === "date") {
      return new Date(a.event.starts_at).getTime() - new Date(b.event.starts_at).getTime();
    }
    if (f.sort === "proximity") {
      const da = a.relevance.distance ?? Number.MAX_SAFE_INTEGER;
      const db = b.relevance.distance ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return b.relevance.score - a.relevance.score;
    }
    return b.relevance.score - a.relevance.score;
  });
  return sorted;
}

/* -------------------------------- calendar -------------------------------- */

function icsStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeIcs(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function eventLocationLine(event: NetworkEvent): string {
  if (event.format === "virtual") return "Online";
  const place = [event.city, event.country].filter(Boolean).join(", ");
  return place || "Online";
}

export function buildIcs(events: NetworkEvent[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ada//Network//EN", "CALSCALE:GREGORIAN"];
  for (const event of events) {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 7_200_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@ada`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
      `LOCATION:${escapeIcs(eventLocationLine(event))}`,
      `DESCRIPTION:${escapeIcs(`${event.organizer} · via ${event.source}\n${event.description ?? ""}\n${event.url}`)}`,
      `URL:${event.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const compact = (date: Date) => `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

export function googleCalendarUrl(event: NetworkEvent): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 7_200_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(start)}/${compact(end)}`,
    details: `${event.organizer} · via ${event.source}\n${event.url}`,
    location: eventLocationLine(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: NetworkEvent): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 7_200_000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `${event.organizer} · via ${event.source}\n${event.url}`,
    location: eventLocationLine(event),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/* --------------------------------- display -------------------------------- */

export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Deterministic demo cohort initials — clearly labelled as demo activity in the UI. */
const DEMO_NAMES = ["Lea", "Nadia", "Priya", "Sofia", "Mira", "Anouk", "Yara", "Ines", "Tessa", "Ruth"];

export function cohortInitials(event: NetworkEvent): string[] {
  const seed = event.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const count = Math.min(3, Math.max(0, event.cohort_going));
  return Array.from({ length: count }, (_, i) => DEMO_NAMES[(seed + i * 3) % DEMO_NAMES.length]![0]!);
}
