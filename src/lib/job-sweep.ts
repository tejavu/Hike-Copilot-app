import { normaliseSkill } from "./catalog";
import type { ExperienceEntry, SkillConfidence } from "./domain";
import { EXPERIENCE_FLOOR_MONTHS, weightedExperienceMonths } from "./experience-weight";

/** A role as it comes back from a live source (or the labelled AI fallback). */
export type SourcedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  seniority: string;
  url: string | null;
  source: string;
  is_example: boolean;
};

export type GeneratedJob = SourcedJob;

/** Cities/regions we can search against. */
export const LOCATION_OPTIONS = [
  "Zurich, CH",
  "Basel, CH",
  "Bern, CH",
  "Geneva, CH",
  "Lausanne, CH",
  "Lugano, CH",
  "St. Gallen, CH",
  "Winterthur, CH",
  "Zug, CH",
  "Berlin, DE",
  "Munich, DE",
  "Hamburg, DE",
  "Vienna, AT",
  "Amsterdam, NL",
  "Paris, FR",
  "Brussels, BE",
  "Copenhagen, DK",
  "Stockholm, SE",
  "Dublin, IE",
  "London, UK",
  "Madrid, ES",
  "Barcelona, ES",
  "Milan, IT",
  "Lisbon, PT",
  "Warsaw, PL",
  "Prague, CZ",
  "Remote, EU",
];

/** The Swiss-only subset — the onboarding sweep never leaves Switzerland. */
export const CH_LOCATION_OPTIONS = [
  ...LOCATION_OPTIONS.filter((l) => l.endsWith(", CH")),
  "Remote, CH",
];

export type Setup = "remote" | "hybrid" | "onsite";

// ------------------------------------------------------------------ level

export type TargetLevel = "junior" | "mid" | "senior";

/** Where a posting sits, read off the seniority tag we store at ingestion. */
export function levelOfJob(seniority: string | null | undefined, title = ""): TargetLevel {
  const value = `${seniority ?? ""} ${title}`.toLowerCase();
  if (/intern|junior|graduate|entry|einsteiger/.test(value)) return "junior";
  if (/senior|principal|staff|lead|head of|director/.test(value)) return "senior";
  return "mid";
}

const LEVEL_ORDER: TargetLevel[] = ["junior", "mid", "senior"];

/**
 * Works out roughly what level she's aiming at.
 *
 * Time served is a floor, not one input among many: until the weighted
 * experience total clears EXPERIENCE_FLOOR_MONTHS (full-time counted in full,
 * working-student at half, internships at about a third), the answer is Junior
 * no matter how confident she feels — course-driven confidence alone doesn't
 * make someone mid-level in Swiss hiring. Above the floor, skill confidence
 * decides between Mid and Senior.
 *
 * Returns null when there's genuinely nothing to go on, so the caller can ask.
 */
export function deriveTargetLevel(
  skills: SkillConfidence[],
  recentRole: string | null | undefined,
  experience?: ExperienceEntry[] | null,
): TargetLevel | null {
  const levelled = skills.filter((s) => Number.isFinite(s.level) && s.level > 0);
  const role = (recentRole ?? "").trim().toLowerCase();
  const fresh =
    role.length === 0 ||
    /starting fresh|no experience|none|student|graduat|career change/.test(role);

  const weightedMonths = weightedExperienceMonths(experience);
  const measured = weightedMonths > 0;

  if (levelled.length === 0 && fresh && !measured) return null;

  const avg = levelled.length
    ? levelled.reduce((sum, s) => sum + s.level, 0) / levelled.length
    : 3;

  // Dated history we could actually read: the floor rules.
  if (measured) {
    if (weightedMonths < EXPERIENCE_FLOOR_MONTHS) return "junior";
    return avg >= 4.2 ? "senior" : "mid";
  }

  // No dated history to weigh — fall back to the softer signals.
  if (levelled.length === 0) return "mid";
  if (fresh) return "junior";
  if (avg >= 4.2) return "senior";
  if (avg >= 3) return "mid";
  return "junior";
}

/** Nudges, never a wall: on-level roles lead, two steps away drop back. */
function levelFactor(job: SourcedJob, target: TargetLevel | null | undefined): number {
  if (!target) return 1;
  const distance = Math.abs(
    LEVEL_ORDER.indexOf(levelOfJob(job.seniority, job.title)) - LEVEL_ORDER.indexOf(target),
  );
  if (distance === 0) return 1.3;
  if (distance === 1) return 1;
  return 0.6;
}

export function setupOf(location: string, description = ""): Setup {
  const value = `${location} ${description}`.toLowerCase();
  if (value.includes("hybrid")) return "hybrid";
  if (value.includes("remote") || value.includes("work from home")) return "remote";
  return "onsite";
}

export function normaliseSetup(value: string): Setup | null {
  const v = value.toLowerCase();
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("site") || v.includes("office")) return "onsite";
  return null;
}

export function cityOf(location: string): string {
  return (location.split(/[(,]/)[0] ?? location).trim().toLowerCase();
}

// ---------------------------------------------------------------- matching

/**
 * Words that carry no signal on their own. Without this list a skill such as
 * "FSM Design" matches every posting that mentions design.
 */
const STOP_TOKENS = new Set([
  "design",
  "engineer",
  "engineering",
  "developer",
  "development",
  "systems",
  "system",
  "software",
  "technical",
  "senior",
  "junior",
  "management",
  "analysis",
  "data",
  "science",
  "computer",
  "and",
  "the",
  "with",
  "for",
]);

/** Names that mean the same thing but are written differently. */
const ALIASES: Record<string, string> = {
  "c++": "c/c++",
  c: "c/c++",
  cpp: "c/c++",
  js: "javascript",
  ts: "typescript",
  "node.js": "node",
  nodejs: "node",
  py: "python",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
  ml: "machine learning",
  ai: "machine learning",
  dl: "deep learning",
  k8s: "kubernetes",
  gcp: "google cloud",
  "amazon web services": "aws",
  "embedded c": "embedded systems",
  firmware: "embedded systems",
  rtl: "fpga",
  hdl: "fpga",
  vhdl: "vhdl",
  "digital design": "fpga",
  dsp: "signal processing",
  ux: "user experience",
  ui: "user interface",
};

function canonical(skill: string): string {
  const key = normaliseSkill(skill);
  return ALIASES[key] ?? key;
}

function tokensOf(value: string): string[] {
  return normaliseSkill(value)
    .split(/[^a-z0-9+#./]+/)
    .map((t) => t.replace(/[.]+$/, ""))
    .filter((t) => t.length > 2 && !STOP_TOKENS.has(t));
}

export type MatchProfile = {
  /** Skills with confidence levels — level drives the weight. */
  skills: SkillConfidence[];
  interests: string[];
  setups?: string[];
  locations?: string[];
  count?: number;
  /** Roughly the level she's aiming at; null when we couldn't tell. */
  targetLevel?: TargetLevel | null;
};

function weightFor(level: number): number {
  if (level >= 5) return 6;
  if (level === 4) return 5;
  if (level === 3) return 4;
  return 2;
}

/** How strongly one posting speaks to this person's skills and interests. */
export function scoreJob(job: SourcedJob, profile: MatchProfile): number {
  return matchJob(job, profile).score;
}

/**
 * Score plus how many of her skills and interests the posting genuinely names.
 * A posting has to actually mention something she can do or something she's
 * drawn to — a pile of weak partial-token hits shouldn't add up to a "match".
 */
export function matchJob(
  job: SourcedJob,
  profile: MatchProfile,
): { score: number; skillHits: number; interestHits: number } {
  const haystackExact = new Set(job.required_skills.map(canonical));
  const text = `${job.title} ${job.required_skills.join(" ")} ${job.description}`;
  const haystackTokens = new Set(tokensOf(text));
  const titleTokens = new Set(tokensOf(job.title));

  let score = 0;
  let skillHits = 0;
  let interestHits = 0;
  const credit = (term: string, weight: number, kind: "skill" | "interest") => {
    const key = canonical(term);
    if (!key) return;
    if (haystackExact.has(key)) {
      score += weight * 2;
      if (kind === "skill") skillHits += 1;
      else interestHits += 1;
      return;
    }
    const terms = tokensOf(key);
    if (terms.length === 0) return;
    const hits = terms.filter((t) => haystackTokens.has(t));
    if (hits.length === terms.length) {
      score += weight;
      if (kind === "skill") skillHits += 1;
      else interestHits += 1;
    } else if (hits.length > 0) score += weight * 0.4;
    if (terms.some((t) => titleTokens.has(t))) score += weight * 0.5;
  };

  for (const skill of profile.skills) credit(skill.name, weightFor(skill.level), "skill");
  for (const interest of profile.interests) credit(interest, 3, "interest");
  return { score: score * levelFactor(job, profile.targetLevel), skillHits, interestHits };
}


/**
 * Filters live postings down to the ones that actually fit: setup is a hard
 * constraint, city relaxes only if nothing survives, and a posting has to
 * clear a real relevance bar rather than being the least-bad of a fixed list.
 */
export function rankJobs(
  jobs: SourcedJob[],
  profile: MatchProfile,
): { jobs: SourcedJob[]; widened: boolean } {
  const { count = 6 } = profile;
  const allowedSetups = new Set(
    (profile.setups ?? []).map(normaliseSetup).filter((s): s is Setup => Boolean(s)),
  );
  const wantedCities = (profile.locations ?? []).map(cityOf).filter(Boolean);

  const seen = new Set<string>();
  const unique = jobs.filter((job) => {
    const key = `${normaliseSkill(job.title)}|${normaliseSkill(job.company)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const hasSkills = profile.skills.length > 0;
  const hasInterests = profile.interests.length > 0;
  const hasSignal = hasSkills || hasInterests;
  const scored = unique
    .map((job) => ({ job, ...matchJob(job, profile) }))
    // A posting only counts as a match if it names at least one thing she can
    // already do OR one thing she said she's drawn to (roles she wants to work
    // towards); score alone let vaguely-worded junior ads through.
    .filter(
      (row) =>
        !hasSignal ||
        (row.score >= 4 &&
          (!hasSkills || row.skillHits >= 1 || (hasInterests && row.interestHits >= 1))),
    )
    .sort((a, b) => b.score - a.score);


  const bySetup = scored.filter((row) => {
    if (allowedSetups.size === 0) return true;
    return allowedSetups.has(setupOf(row.job.location, row.job.description));
  });

  const byCity = bySetup.filter((row) => {
    if (wantedCities.length === 0) return true;
    const value = row.job.location.toLowerCase();
    if (setupOf(row.job.location, row.job.description) === "remote") return true;
    return wantedCities.some((city) => value.includes(city));
  });

  const widened = byCity.length === 0 && bySetup.length > 0;
  const pool = widened ? bySetup : byCity;

  // Level is a wall, not a nudge: only roles at the level she's at now, or the
  // one level the roadmap is building her toward, may be suggested. A junior
  // never sees mid-level postings, even if that leaves the list short.
  if (profile.targetLevel) {
    const targetIndex = LEVEL_ORDER.indexOf(profile.targetLevel);
    const reachable = pool.filter((row) => {
      const jobIndex = LEVEL_ORDER.indexOf(levelOfJob(row.job.seniority, row.job.title));
      return jobIndex >= targetIndex && jobIndex <= targetIndex + 1;
    });
    if (reachable.length > 0 || targetIndex === 0) {
      // For juniors, "reachable" is junior + mid — but mid is only allowed as
      // the roadmap's destination, which juniors haven't reached: hard-cap at
      // the target level unless nothing on-level exists at all.
      const onLevel = reachable.filter(
        (row) => levelOfJob(row.job.seniority, row.job.title) === profile.targetLevel,
      );
      const finalPool =
        profile.targetLevel === "junior"
          ? onLevel
          : reachable.length >= count
            ? reachable
            : [...onLevel, ...reachable.filter((row) => !onLevel.includes(row))];
      return { jobs: finalPool.slice(0, count).map((row) => row.job), widened };
    }
  }

  return { jobs: pool.slice(0, count).map((row) => row.job), widened };
}

// ---------------------------------------------------------------- skill gap

function gapTokens(skill: string): string[] {
  return normaliseSkill(skill)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
}

/** Skill families — a gap next to something she has is far easier to close. */
const ADJACENT: Record<string, string[]> = {
  sql: ["python", "data visualisation", "machine learning", "stakeholder communication"],
  python: ["sql", "machine learning", "docker", "system design"],
  react: ["typescript", "testing", "accessibility", "design systems"],
  typescript: ["react", "testing", "accessibility", "docker"],
  docker: ["kubernetes", "ci/cd", "aws", "system design"],
  aws: ["docker", "kubernetes", "ci/cd"],
  testing: ["ci/cd", "typescript", "attention to detail"],
  "machine learning": ["python", "sql", "aws", "deep learning"],
  "c/c++": ["embedded systems", "rtos", "linux", "python"],
  "embedded systems": ["c/c++", "rtos", "linux", "signal processing"],
  fpga: ["vhdl", "verilog", "system verilog", "signal processing"],
  "signal processing": ["python", "machine learning", "matlab"],
  "product thinking": ["stakeholder communication", "roadmapping", "sql"],
};

/** How closely a missing skill builds on something she can already do. */
function relatedness(gap: string, existing: string[]): number {
  const wanted = new Set(gapTokens(gap));
  let best = 0;
  for (const skill of existing) {
    const shared = gapTokens(skill).filter((t) => wanted.has(t)).length;
    if (shared > 0) best = Math.max(best, 2 + shared);
    else if (ADJACENT[canonical(skill)]?.includes(canonical(gap))) best = Math.max(best, 2);
  }
  return best;
}

/**
 * Splits the skills the liked roles ask for into what she already has and the
 * few most worthwhile gaps — the ones that build on her existing skills come
 * first, and the list stays short enough to actually finish.
 */
export function skillGap(profileSkills: string[], jobSkills: string[], maxGaps = 5) {
  const have = new Set(profileSkills.map(canonical));
  const needed = Array.from(new Set(jobSkills.map((s) => s.trim()).filter(Boolean)));
  const strengths = needed.filter((s) => have.has(canonical(s)));

  const demand = new Map<string, number>();
  for (const skill of jobSkills) {
    const key = canonical(skill);
    demand.set(key, (demand.get(key) ?? 0) + 1);
  }

  const gaps = needed
    .filter((s) => !have.has(canonical(s)))
    .map((skill) => ({
      skill,
      related: relatedness(skill, profileSkills),
      demand: demand.get(canonical(skill)) ?? 1,
    }))
    .sort((a, b) => b.related - a.related || b.demand - a.demand || a.skill.localeCompare(b.skill))
    .slice(0, maxGaps)
    .map((row) => row.skill);

  return { strengths, gaps };
}
