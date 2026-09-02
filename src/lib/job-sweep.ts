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

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length] as T;
}

export function sweepJobs(
  interests: string[],
  skills: string[],
  opts: { count?: number; setups?: string[]; location?: string } = {},
): GeneratedJob[] {
  const { count = 6, setups = [], location = "" } = opts;
  const signal = [...interests, ...skills].map(normaliseSkill).filter(Boolean);
  const wantsRemote = setups.some((s) => /remote/i.test(s));
  const wantsHybrid = setups.some((s) => /hybrid/i.test(s));
  const wantsOnsite = setups.some((s) => /on-?site/i.test(s));
  const locationNorm = normaliseSkill(location);

  const scored = SEEDS.map((seed, index) => {
    let score = 0;
    for (const term of signal) {
      if (seed.tags.some((tag) => tag.includes(term) || term.includes(tag))) score += 3;
      if (seed.skills.some((s) => normaliseSkill(s) === term)) score += 2;
      if (normaliseSkill(seed.title).includes(term)) score += 2;
    }
    return { seed, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const filtered = scored.filter(({ seed }) => {
    if (setups.length === 0 && !location) return true;
    const seedLocations = seed.locations.map((l) => normaliseSkill(l));
    const hasRemote = seedLocations.some((l) => l.includes("remote"));
    const hasHybrid = seedLocations.some((l) => l.includes("hybrid"));
    const hasOnsite = seedLocations.some((l) => l.includes("on-site") || l.includes("onsite"));
    const setupMatch =
      setups.length === 0 ||
      (wantsRemote && hasRemote) ||
      (wantsHybrid && hasHybrid) ||
      (wantsOnsite && hasOnsite);
    const locationMatch =
      !location ||
      seedLocations.some((l) => l.includes(locationNorm) || locationNorm.includes(l.replace(/\s+/g, " ").trim()));
    return setupMatch || locationMatch;
  });

  const chosen = (filtered.length >= count ? filtered : scored).slice(0, Math.max(count, 4));

  return chosen.map(({ seed, index }, i) => {
    const stretch = signal.length ? titleCase(signal[i % signal.length] ?? "") : "";
    const extra = stretch && !seed.skills.some((s) => normaliseSkill(s) === normaliseSkill(stretch)) ? [stretch] : [];
    return {
      title: seed.title,
      company: pick(seed.companies, index + i),
      location: pick(seed.locations, index + i * 2),
      description: seed.blurb,
      required_skills: [...seed.skills, ...extra],
      seniority: seed.seniority,
    };
  });
}

export function skillGap(profileSkills: string[], jobSkills: string[]) {
  const have = new Set(profileSkills.map(normaliseSkill));
  const needed = Array.from(new Set(jobSkills.map((s) => s.trim()).filter(Boolean)));
  const strengths = needed.filter((s) => have.has(normaliseSkill(s)));
  const gaps = needed.filter((s) => !have.has(normaliseSkill(s)));
  return { strengths, gaps };
}
