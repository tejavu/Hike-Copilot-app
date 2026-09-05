import type { ExperienceEntry } from "./domain";

/**
 * How a role counted toward real professional experience. Swiss CVs mix
 * full-time roles with working-student jobs and internships, and hiring here
 * treats them very differently — so we keep them apart rather than summing
 * everything into "years of experience".
 */
export type EmploymentType = "full_time" | "working_student" | "internship";

export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time role" },
  { value: "working_student", label: "Working student / part-time" },
  { value: "internship", label: "Internship" },
];

/** Weight applied to each month served in that kind of role. */
export const EMPLOYMENT_WEIGHT: Record<EmploymentType, number> = {
  full_time: 1,
  working_student: 0.5,
  internship: 0.34,
};

/**
 * Weighted months below which we refuse to suggest anything above Junior,
 * however confident she feels about her skills. Roughly two years of real
 * full-time work, which is where Swiss employers start reading a CV as mid.
 */
export const EXPERIENCE_FLOOR_MONTHS = 20;

const INTERNSHIP_RE =
  /\b(intern(ship)?s?|trainee|praktik(um|ant(in)?)|stagiaire|stage\b|tirocini(o|a)|stagista|becari[oa]|pratikum|summer\s+intern|internato)\b/i;

const WORKING_STUDENT_RE =
  /\b(working\s*student|werkstudent(in)?|student\s+assistant|studentische[rn]?\s+hilfskraft|hiwi|assistant[- ]?étudiant|étudiant[- ]?assistant|studente\s+lavoratore|part[-\s]?time|teilzeit|temps\s+partiel|tempo\s+parziale|casual|nebenjob|apprentice|apprenti[e]?|lehrling|apprendist[ao]|research\s+assistant|teaching\s+assistant|tutor)\b/i;

/** Reads the role's own words to guess how it should be weighted. */
export function classifyEmployment(...parts: (string | undefined | null)[]): EmploymentType {
  const text = parts.filter(Boolean).join(" ");
  if (INTERNSHIP_RE.test(text)) return "internship";
  if (WORKING_STUDENT_RE.test(text)) return "working_student";
  return "full_time";
}

/** Normalises whatever we were handed (model output, old rows) to a type. */
export function toEmploymentType(value: unknown): EmploymentType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (v === "full_time" || v === "fulltime" || v === "permanent") return "full_time";
  if (v === "working_student" || v === "part_time" || v === "parttime") return "working_student";
  if (v === "internship" || v === "intern") return "internship";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  gen: 1, mär: 3, mrz: 3, mai: 5, okt: 10, dez: 12,
  janv: 1, févr: 2, avr: 4, juin: 6, juil: 7, aoû: 8, déc: 12,
};

const NOW_RE = /\b(now|present|current|today|heute|aktuell|laufend|présent|actuel|aujourd|attuale|oggi|ongoing)\b/i;

function monthOf(text: string): number | null {
  const key = text.slice(0, 4).toLowerCase();
  return MONTHS[key] ?? MONTHS[key.slice(0, 3)] ?? null;
}

/** Rough length of a period string like "Jan 2022 – Mar 2023" or "2021–now". */
export function monthsInPeriod(period: string | undefined | null): number {
  const text = (period ?? "").trim();
  if (!text) return 0;

  const explicit = text.match(/(\d{1,3})\s*(months?|monate|mois|mesi)\b/i);
  if (explicit) return Math.min(600, Number(explicit[1]));
  const explicitYears = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(years?|jahre|ans|anni)\b/i);
  if (explicitYears) return Math.round(Number(explicitYears[1]!.replace(",", ".")) * 12);

  const points: { year: number; month: number }[] = [];
  const re = /([A-Za-zÀ-ÿ]{3,10})?\.?\s*(\d{4})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const year = Number(match[2]);
    if (year < 1950 || year > 2100) continue;
    points.push({ year, month: (match[1] ? monthOf(match[1]) : null) ?? (points.length === 0 ? 1 : 12) });
  }
  if (points.length === 0) return 0;

  const start = points[0]!;
  const now = new Date();
  const end =
    points.length > 1
      ? points[points.length - 1]!
      : NOW_RE.test(text)
        ? { year: now.getFullYear(), month: now.getMonth() + 1 }
        : null;
  if (!end) return 6; // a bare year with no end — count it as half a year

  const months = (end.year - start.year) * 12 + (end.month - start.month) + 1;
  return Math.max(0, Math.min(600, months));
}

/**
 * Total experience in weighted months: full-time counts in full,
 * working-student roughly half, internships about a third.
 */
export function weightedExperienceMonths(entries: ExperienceEntry[] | null | undefined): number {
  let total = 0;
  for (const entry of entries ?? []) {
    const months = monthsInPeriod(entry.period);
    if (months <= 0) continue;
    const type =
      toEmploymentType(entry.employment_type) ??
      classifyEmployment(entry.title, entry.company, entry.detail);
    total += months * EMPLOYMENT_WEIGHT[type];
  }
  return Math.round(total);
}

/** Turns free-text role lines into entries we can weigh. */
export function experienceFromLines(lines: string[]): ExperienceEntry[] {
  return lines.map((line) => {
    const period = line.match(/\(([^)]*\d{4}[^)]*)\)/)?.[1] ?? "";
    return { title: line, period, employment_type: classifyEmployment(line) };
  });
}
