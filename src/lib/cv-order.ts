/**
 * Ordering for free-text period fields ("September 2021 -- September 2023",
 * "July 2017 – May 2021", "September 2024 - ongoing", "2019").
 *
 * Nothing that writes education/experience has to store them in the right
 * order: sorting happens at display time, from the dates the user wrote.
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const ONGOING = /\b(ongoing|present|current|currently|now|today|date)\b/i;

/** Splits on the various dashes people type between the two dates. */
function halves(period: string): string[] {
  return period
    .split(/\s*(?:--+|[-–—]|\bto\b|\buntil\b|\u2013|\u2014)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** "September 2023", "09/2023", "2023-09", "2023" -> sortable timestamp. */
function parsePoint(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  const named = text.match(/([A-Za-z]{3,9})\.?\s*,?\s*(\d{4})/);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (month !== undefined) return Date.UTC(Number(named[2]), month, 1);
  }

  const numeric = text.match(/(\d{1,2})[./](\d{4})/);
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return Date.UTC(Number(numeric[2]), month - 1, 1);
  }

  const iso = text.match(/(\d{4})[-/](\d{1,2})/);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return Date.UTC(Number(iso[1]), month - 1, 1);
  }

  const year = text.match(/\b(19|20)\d{2}\b/);
  if (year) return Date.UTC(Number(year[0]), 11, 31);

  return null;
}

/**
 * The end of the period, as a sortable number. "ongoing"/"present"/"current"
 * sorts above everything. Returns null when the text can't be understood.
 */
export function parsePeriodEnd(period: string | null | undefined): number | null {
  const text = (period ?? "").trim();
  if (!text) return null;
  if (ONGOING.test(text)) return Number.MAX_SAFE_INTEGER;

  const parts = halves(text);
  if (parts.length === 0) return null;
  // Second date if there is a range, otherwise the only date given.
  return parsePoint(parts[parts.length - 1]) ?? parsePoint(parts[0]);
}

/**
 * Newest first. Entries with an unreadable period keep their original
 * relative order and go last, with a warning so it's visible.
 */
export function sortByPeriodDesc<T extends { period?: string | null }>(
  entries: readonly T[],
  context = "entry",
): T[] {
  const dated: { item: T; end: number; index: number }[] = [];
  const undated: T[] = [];

  entries.forEach((item, index) => {
    const end = parsePeriodEnd(item.period);
    if (end === null) {
      if ((item.period ?? "").trim()) {
        console.warn(`[cv-order] Could not read the period on this ${context}: "${item.period}" — placing it last.`);
      }
      undated.push(item);
      return;
    }
    dated.push({ item, end, index });
  });

  dated.sort((a, b) => (b.end - a.end) || (a.index - b.index));
  return [...dated.map((d) => d.item), ...undated];
}
