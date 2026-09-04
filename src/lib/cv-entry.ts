/**
 * One-line text form of a CV entry, and the reverse: turning an edited line
 * back into its parts. Used so onboarding can show entries in a textarea
 * without losing the organisation and the dates.
 */
export type EntryParts = { title: string; org: string; period: string; detail: string };

export function formatEntryLine(parts: { [K in keyof EntryParts]?: string | undefined }): string {
  const head = [parts.title?.trim(), parts.org?.trim()].filter(Boolean).join(" — ");
  const tail = parts.period?.trim() ? ` (${parts.period.trim()})` : "";
  const detail = parts.detail?.trim() ? ` — ${parts.detail.trim()}` : "";
  return `${head}${detail}${tail}`.trim();
}

/** "Firmware Engineer — CERN (Oct 2023 – Jun 2024)" -> its three parts. */
export function parseEntryLine(line: string): EntryParts {
  const text = line.trim();
  let period = "";
  let rest = text;
  const match = text.match(/\(([^()]*)\)\s*$/);
  if (match?.[1] && /\d/.test(match[1])) {
    period = match[1].trim();
    rest = text.slice(0, match.index).trim();
  }
  const pieces = rest.split(/\s+[—–-]\s+/);
  const title = (pieces.shift() ?? "").trim();
  const org = (pieces.shift() ?? "").trim();
  const detail = pieces.join(" — ").trim();
  return { title, org, period, detail };
}
