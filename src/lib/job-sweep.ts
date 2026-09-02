import { normaliseSkill, titleCase } from "./catalog";

type JobSeed = {
  title: string;
  seniority: string;
  companies: string[];
  locations: string[];
  skills: string[];
  blurb: string;
  tags: string[];
};

const SEEDS: JobSeed[] = [
  {
    title: "Frontend Engineer",
    seniority: "Mid-level",
    companies: ["Lumen Health", "Northwind Labs", "Verdea", "Kite & Co"],
    locations: ["Zurich, CH (hybrid)", "Berlin, DE (remote)", "Remote, EU"],
    skills: ["React", "TypeScript", "Testing", "Accessibility"],
    blurb:
      "Join a small product team building the interface thousands of clinicians use daily. You'll own features end to end with a designer beside you.",
    tags: ["frontend", "web", "react", "ui", "design", "javascript", "typescript"],
  },
  {
    title: "Full-Stack Developer",
    seniority: "Mid-level",
    companies: ["Ovato", "Halden Digital", "Brightloom"],
    locations: ["Basel, CH (hybrid)", "Remote, EU", "Amsterdam, NL"],
    skills: ["TypeScript", "React", "SQL", "Docker"],
    blurb:
      "A product-led team that ships weekly. You'll move between API work and interface work, with real ownership of what you build.",
    tags: ["fullstack", "web", "backend", "react", "node", "typescript", "sql"],
  },
  {
    title: "Data Analyst",
    seniority: "Junior → Mid",
    companies: ["Meridian Retail", "Alpine Insurance", "Cassia Group"],
    locations: ["Zurich, CH (hybrid)", "Remote, CH", "Munich, DE"],
    skills: ["SQL", "Python", "Data Visualisation", "Stakeholder communication"],
    blurb:
      "Turn messy operational data into decisions leadership actually makes. Strong mentoring culture and a analytics lead who teaches.",
    tags: ["data", "analytics", "sql", "python", "visualisation", "bi", "statistics"],
  },
  {
    title: "Machine Learning Engineer",
    seniority: "Mid-level",
    companies: ["Nimbus AI", "Foldwise", "Terra Signal"],
    locations: ["Remote, EU", "Lausanne, CH (hybrid)", "Copenhagen, DK"],
    skills: ["Python", "Machine Learning", "SQL", "AWS"],
    blurb:
      "Take models from notebook to production alongside a research team. Real users, real feedback loops, no ivory tower.",
    tags: ["ml", "ai", "machine learning", "python", "data", "deep learning"],
  },
  {
    title: "Cloud / DevOps Engineer",
    seniority: "Mid-level",
    companies: ["Steelpath", "Corvi Systems", "Arbor Cloud"],
    locations: ["Remote, EU", "Geneva, CH (hybrid)", "Vienna, AT"],
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
    blurb:
      "Make deploys boring. You'll own the platform that a 40-person engineering org ships on, with budget for certifications.",
    tags: ["devops", "cloud", "aws", "infrastructure", "docker", "kubernetes", "sre", "platform"],
  },
  {
    title: "Backend Engineer",
    seniority: "Mid-level",
    companies: ["Fjordline", "Solera Pay", "Mistral Freight"],
    locations: ["Remote, EU", "Zurich, CH (hybrid)", "Lisbon, PT"],
    skills: ["Python", "SQL", "System Design", "Docker"],
    blurb:
      "Design services that handle real transaction volume. Thoughtful code review culture and no on-call heroics expected.",
    tags: ["backend", "api", "python", "sql", "system design", "java", "go"],
  },
  {
    title: "Product Manager, Technical",
    seniority: "Mid-level",
    companies: ["Havenly Software", "Beacon Tools", "Palo Studio"],
    locations: ["Zurich, CH (hybrid)", "Remote, EU", "Stockholm, SE"],
    skills: ["Product Thinking", "SQL", "Stakeholder communication", "Roadmapping"],
    blurb:
      "Sit between engineering and customers and decide what's worth building. You'll be trusted with a real problem space from week one.",
    tags: ["product", "pm", "product management", "strategy", "ux"],
  },
  {
    title: "QA / Test Automation Engineer",
    seniority: "Junior → Mid",
    companies: ["Corvi Systems", "Lumen Health", "Rho Mobility"],
    locations: ["Remote, EU", "Bern, CH (hybrid)", "Warsaw, PL"],
    skills: ["TypeScript", "Testing", "CI/CD", "Attention to detail"],
    blurb:
      "Own the safety net. You'll build the automated suites that let the team ship on a Friday without flinching.",
    tags: ["qa", "testing", "automation", "quality", "typescript"],
  },
  {
    title: "UX Engineer",
    seniority: "Mid-level",
    companies: ["Palo Studio", "Verdea", "Ateliér Nine"],
    locations: ["Remote, EU", "Zurich, CH (hybrid)", "Paris, FR"],
    skills: ["React", "Accessibility", "Design systems", "TypeScript"],
    blurb:
      "The bridge between design and code. You'll grow the design system every product team builds on.",
    tags: ["ux", "design", "frontend", "design systems", "accessibility", "ui"],
  },
];

export type GeneratedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  required_skills: string[];
  seniority: string;
};

/** Cities/regions the seeded roles are actually posted in. */
export const LOCATION_OPTIONS = [
  "Zurich, CH",
  "Basel, CH",
  "Bern, CH",
  "Geneva, CH",
  "Lausanne, CH",
  "Berlin, DE",
  "Munich, DE",
  "Vienna, AT",
  "Amsterdam, NL",
  "Paris, FR",
  "Copenhagen, DK",
  "Stockholm, SE",
  "Lisbon, PT",
  "Warsaw, PL",
  "Remote, EU",
];

type Setup = "remote" | "hybrid" | "onsite";

function setupOf(location: string): Setup {
  const value = location.toLowerCase();
  if (value.includes("hybrid")) return "hybrid";
  if (value.includes("remote")) return "remote";
  return "onsite";
}

function normaliseSetup(value: string): Setup | null {
  const v = value.toLowerCase();
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("site") || v.includes("office")) return "onsite";
  return null;
}

function cityOf(location: string): string {
  return (location.split("(")[0] ?? location).trim().toLowerCase();
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length] as T;
}

export function sweepJobs(
  interests: string[],
  skills: string[],
  opts: { count?: number; setups?: string[]; locations?: string[] } = {},
): GeneratedJob[] {
  const { count = 6, setups = [], locations = [] } = opts;

  const skillTerms = skills.map(normaliseSkill).filter(Boolean);
  const interestTerms = interests.map(normaliseSkill).filter(Boolean);
  const hasSignal = skillTerms.length > 0 || interestTerms.length > 0;

  const allowedSetups = new Set(
    setups.map(normaliseSetup).filter((s): s is Setup => Boolean(s)),
  );
  const wantedCities = locations.map(cityOf).filter(Boolean);

  // Score every seed against the user's *own* skills first, interests second.
  const scored = SEEDS.map((seed, index) => {
    let score = 0;
    const match = (term: string, weight: number) => {
      if (seed.skills.some((s) => normaliseSkill(s) === term)) score += weight * 2;
      if (seed.tags.some((tag) => tag === term || tag.includes(term) || term.includes(tag))) score += weight;
      if (normaliseSkill(seed.title).includes(term)) score += weight;
    };
    for (const term of skillTerms) match(term, 4);
    for (const term of interestTerms) match(term, 2);
    return { seed, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  // Never fall back to a generic computer-science shortlist: if we know
  // something about her, only roles that actually touch it are eligible.
  const relevant = hasSignal ? scored.filter((row) => row.score > 0) : scored;

  const viableLocations = (seedLocations: string[], applyCityFilter: boolean) =>
    seedLocations.filter((location) => {
      if (allowedSetups.size > 0 && !allowedSetups.has(setupOf(location))) return false;
      if (applyCityFilter && wantedCities.length > 0) {
        const value = location.toLowerCase();
        return wantedCities.some((city) => value.includes(city) || city.includes(cityOf(location)));
      }
      return true;
    });

  const build = (applyCityFilter: boolean) =>
    relevant
      .map((row) => ({ ...row, viable: viableLocations(row.seed.locations, applyCityFilter) }))
      .filter((row) => row.viable.length > 0);

  // Setup is a hard constraint; the city list relaxes first if it's too narrow.
  let pool = build(true);
  if (pool.length < Math.min(count, 3)) pool = build(false);

  return pool.slice(0, Math.max(count, 4)).map(({ seed, index, viable }, i) => {
    const stretch = skillTerms.length ? titleCase(skillTerms[i % skillTerms.length] ?? "") : "";
    const extra = stretch && !seed.skills.some((s) => normaliseSkill(s) === normaliseSkill(stretch)) ? [stretch] : [];
    return {
      title: seed.title,
      company: pick(seed.companies, index + i),
      location: pick(viable, index + i * 2),
      description: seed.blurb,
      required_skills: [...seed.skills, ...extra],
      seniority: seed.seniority,
    };
  });
}

function tokens(skill: string): string[] {
  return normaliseSkill(skill)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
}

/** How closely a missing skill builds on something she can already do. */
function relatedness(gap: string, existing: string[]): number {
  const gapTokens = new Set(tokens(gap));
  let best = 0;
  for (const skill of existing) {
    const shared = tokens(skill).filter((t) => gapTokens.has(t)).length;
    if (shared > 0) best = Math.max(best, 2 + shared);
    else if (ADJACENT[normaliseSkill(skill)]?.includes(normaliseSkill(gap))) best = Math.max(best, 2);
  }
  return best;
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
  "machine learning": ["python", "sql", "aws"],
  "product thinking": ["stakeholder communication", "roadmapping", "sql"],
};

/**
 * Splits the skills the liked roles ask for into what she already has and the
 * few most worthwhile gaps — the ones that build on her existing skills come
 * first, and the list stays short enough to actually finish.
 */
export function skillGap(profileSkills: string[], jobSkills: string[], maxGaps = 5) {
  const have = new Set(profileSkills.map(normaliseSkill));
  const needed = Array.from(new Set(jobSkills.map((s) => s.trim()).filter(Boolean)));
  const strengths = needed.filter((s) => have.has(normaliseSkill(s)));

  const demand = new Map<string, number>();
  for (const skill of jobSkills) {
    const key = normaliseSkill(skill);
    demand.set(key, (demand.get(key) ?? 0) + 1);
  }

  const gaps = needed
    .filter((s) => !have.has(normaliseSkill(s)))
    .map((skill) => ({
      skill,
      related: relatedness(skill, profileSkills),
      demand: demand.get(normaliseSkill(skill)) ?? 1,
    }))
    .sort((a, b) => b.related - a.related || b.demand - a.demand || a.skill.localeCompare(b.skill))
    .slice(0, maxGaps)
    .map((row) => row.skill);

  return { strengths, gaps };
}

