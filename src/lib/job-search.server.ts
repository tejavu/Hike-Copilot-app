import { z } from "zod";
import { deriveTargetLevel, rankJobs, type SourcedJob, type TargetLevel } from "./job-sweep";

const inputSchema = z.object({
  skills: z.array(z.object({ name: z.string(), level: z.number() })).default([]),
  interests: z.array(z.string()).default([]),
  drawnTo: z.string().default(""),
  locations: z.array(z.string()).default([]),
  setups: z.array(z.string()).default([]),
  count: z.number().min(1).max(20).default(6),
  /** Her most recent role, if any — one of the level signals. */
  recentRole: z.string().default(""),
  /** Set only when she answered the clarifying question herself. */
  targetLevel: z.enum(["junior", "mid", "senior"]).nullish(),
});

export type JobSearchResult = {
  jobs: SourcedJob[];
  sources: string[];
  /** True when every returned role is an AI-written example, not a live posting. */
  examplesOnly: boolean;
  /** True when the city filter had to be relaxed to find anything. */
  widened: boolean;
  /** The level we aimed at, and whether we had to guess. */
  targetLevel: TargetLevel | null;
  levelUnclear: boolean;
  notes: string[];
};

/** Jobs are always scoped to Switzerland, regardless of the user's broader location prefs. */
const ADZUNA_COUNTRY = "ch";

function isSwissLocation(location: string): boolean {
  return location.trim().toUpperCase().endsWith("CH");
}

function cityName(location: string): string {
  return (location.split(",")[0] ?? location).trim();
}

function topTerms(skills: { name: string; level: number }[], interests: string[], drawnTo: string) {
  const ranked = [...skills].sort((a, b) => b.level - a.level).map((s) => s.name);
  const terms = [...ranked.slice(0, 6), ...interests.slice(0, 4)];
  if (terms.length === 0 && drawnTo) terms.push(drawnTo);
  return Array.from(new Set(terms.filter(Boolean)));
}

function tidy(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function seniorityOf(title: string, description: string): string {
  const value = `${title} ${description}`.toLowerCase();
  if (/\b(intern|internship|working student)\b/.test(value)) return "Internship";
  if (/\b(junior|graduate|entry.level|einsteiger)\b/.test(value)) return "Junior";
  if (/\b(principal|staff|head of|director|lead)\b/.test(value)) return "Lead / Principal";
  if (/\b(senior|sr\.)\b/.test(value)) return "Senior";
  return "Mid-level";
}

/**
 * Pull the terms we searched for back out of a posting so cards show real tags.
 * Returns nothing when the posting mentions none of them — inventing her own
 * skills as the posting's tags made unrelated roles look like perfect matches.
 */
function skillsFrom(text: string, terms: string[]): string[] {
  const value = text.toLowerCase();
  return terms.filter((term) => value.includes(term.toLowerCase())).slice(0, 6);
}

// ------------------------------------------------------------------ Adzuna

async function searchAdzuna(
  terms: string[],
  locations: string[],
  notes: string[],
  targetLevel: TargetLevel | null,
): Promise<SourcedJob[]> {
  const appId = process.env["ADZUNA_APP_ID"];
  const appKey = process.env["ADZUNA_APP_KEY"];
  if (!appId || !appKey) {
    notes.push("Adzuna is not configured yet.");
    return [];
  }
  if (terms.length === 0) return [];

  const targets = locations.length > 0 ? locations : ["Zurich, CH"];
  const places = new Map<string, string | null>();
  for (const location of targets) {
    const country = countryOf(location);
    if (!country) continue;
    places.set(`${country}|${cityName(location)}`, cityName(location));
  }
  // Remote-friendly sweep so people open to remote aren't limited to one city.
  places.set("gb|", null);

  // Level words must never sit in the same OR bucket as her skills: a posting
  // matching only "junior" would come back with nothing to do with her field.
  // They go in `what` (an AND filter) as separate passes instead.
  const levelWords: (string | null)[] =
    targetLevel === "junior" ? ["junior", "graduate"] : [null];

  const queries: { country: string; where: string | null; level: string | null }[] = [];
  for (const [key, where] of places.entries()) {
    const country = key.split("|")[0]!;
    for (const level of levelWords) queries.push({ country, where, level });
  }

  // Sequential with a short pause — Adzuna rate-limits burst requests.
  const results: SourcedJob[][] = [];
  for (const { country, where, level } of queries) {
    if (results.length > 0) await new Promise((r) => setTimeout(r, 400));
    results.push(
      await (async () => {
        const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
        url.searchParams.set("app_id", appId);
        url.searchParams.set("app_key", appKey);
        url.searchParams.set("results_per_page", "20");
        url.searchParams.set("what_or", terms.join(" "));
        if (level) url.searchParams.set("what", level);
        url.searchParams.set("max_days_old", "45");
        url.searchParams.set("content-type", "application/json");
        if (where) url.searchParams.set("where", where);


        try {
          // Adzuna throws the occasional 503; one quiet retry saves the search.
          let response = await fetch(url.toString());
          if (response.status >= 500) {
            await new Promise((r) => setTimeout(r, 700));
            response = await fetch(url.toString());
          }
          if (!response.ok) {
            notes.push(`Adzuna (${country}) returned ${response.status}.`);
            return [];
          }
          const body = (await response.json()) as {
            results?: {
              title?: string;
              description?: string;
              redirect_url?: string;
              company?: { display_name?: string };
              location?: { display_name?: string };
            }[];
          };
          return (body.results ?? []).map((row): SourcedJob => {
            const title = tidy(row.title ?? "Role", 90);
            const description = tidy(row.description ?? "");
            return {
              title,
              company: row.company?.display_name?.trim() || "Undisclosed company",
              location: row.location?.display_name?.trim() || where || "Europe",
              description,
              required_skills: skillsFrom(`${title} ${description}`, terms),
              seniority: seniorityOf(title, description),
              url: row.redirect_url ?? null,
              source: "Adzuna",
              is_example: false,
            };
          });
        } catch (error) {
          console.error("adzuna failed", error);
          notes.push("Adzuna could not be reached.");
          return [];
        }
      })(),
    );
  }

  return results.flat();
}

// --------------------------------------------------------------- Firecrawl

/** Only individual vacancy pages — search-result pages aren't real postings. */
const SWISS_DETAIL_PATHS = ["jobs.ch/en/vacancies/detail", "jobup.ch/en/jobs/detail"];

async function searchSwissBoards(
  terms: string[],
  locations: string[],
  notes: string[],
  targetLevel: TargetLevel | null,
): Promise<SourcedJob[]> {
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!gatewayKey || !connectionKey) {
    notes.push("Swiss board search is not configured yet.");
    return [];
  }
  const swissCities = locations.filter((l) => l.trim().toUpperCase().endsWith("CH")).map(cityName);
  if (terms.length === 0) return [];

  const query = [
    SWISS_DETAIL_PATHS.map((p) => `site:${p}`).join(" OR "),
    terms.slice(0, 4).join(" "),
    swissCities.slice(0, 3).join(" "),
    targetLevel === "junior" ? "(junior OR graduate OR entry-level OR internship)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
      body: JSON.stringify({ query, limit: 10 }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`firecrawl search failed [${response.status}]: ${detail}`);
      notes.push(`Swiss job boards returned ${response.status}.`);
      return [];
    }
    type Row = { url?: string; title?: string; description?: string };
    const body = (await response.json()) as { data?: { web?: Row[] } | Row[]; web?: Row[] };
    const rows: Row[] = Array.isArray(body.data) ? body.data : (body.data?.web ?? body.web ?? []);
    return rows
      .filter((row) => SWISS_DETAIL_PATHS.some((p) => (row.url ?? "").includes(p)))
      .map((row): SourcedJob => {
        // Titles read "Electronics Engineer (Master-Level) - Job Offer on jobs.ch"
        const title = tidy(
          (row.title ?? "Role").replace(/\s*[-–|]\s*(job offer on\s*)?job(s|up)\.ch.*$/i, ""),
          110,
        );
        const description = tidy(row.description ?? "");
        const host = (row.url ?? "").includes("jobup.ch") ? "jobup.ch" : "jobs.ch";
        return {
          title,
          company: "See posting",
          location: swissCities[0] ?? "Switzerland",
          description: description || "Full details are on the original posting.",
          required_skills: skillsFrom(`${title} ${description}`, terms),
          seniority: seniorityOf(title, description),
          url: row.url ?? null,
          source: host,
          is_example: false,
        };
      });
  } catch (error) {
    console.error("firecrawl failed", error);
    notes.push("Swiss job boards could not be reached.");
    return [];
  }
}

// ----------------------------------------------------------- AI archetypes

async function exampleRoles(
  terms: string[],
  drawnTo: string,
  locations: string[],
  setups: string[],
  count: number,
  notes: string[],
  targetLevel: TargetLevel | null,
): Promise<SourcedJob[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return [];

  const prompt = `A woman in tech is job hunting. Her strongest skills: ${terms.join(", ") || "unspecified"}.
She is drawn to: ${drawnTo || "unspecified"}. Preferred locations: ${locations.join(", ") || "flexible"}. Work setup: ${setups.join(", ") || "flexible"}.
Seniority to aim for: ${targetLevel === "junior" ? "entry-level — junior, graduate or internship roles only, nothing requiring years of experience" : (targetLevel ?? "mid-level")}.

Write ${count} realistic job archetypes that genuinely match HER field — not generic web or data roles unless that is her field. Return strict JSON:
{"jobs":[{"title":"","company":"","location":"","description":"","required_skills":[""],"seniority":""}]}
Use plausible European employer types (e.g. "a medtech scale-up") rather than inventing real company names. Description: 2 warm sentences. 3-5 required_skills.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`ai archetypes failed [${response.status}]: ${detail}`);
      notes.push(
        response.status === 429
          ? "The example generator is busy — try again in a moment."
          : "Could not generate example roles right now.",
      );
      return [];
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as {
      jobs?: Partial<SourcedJob>[];
    };
    return (parsed.jobs ?? []).slice(0, count).map((row): SourcedJob => ({
      title: row.title ?? "Role",
      company: row.company ?? "Example employer",
      location: row.location ?? locations[0] ?? "Europe",
      description: row.description ?? "",
      required_skills: Array.isArray(row.required_skills) ? row.required_skills : [],
      seniority: row.seniority ?? "Mid-level",
      url: null,
      source: "Example",
      is_example: true,
    }));
  } catch (error) {
    console.error("ai archetypes failed", error);
    return [];
  }
}

// ------------------------------------------------- real skill extraction

/**
 * Reads the actual required/preferred skills out of the postings that made the
 * final list. Only the ranked shortlist is sent, to keep the cost bounded.
 */
async function extractRequiredSkills(jobs: SourcedJob[], notes: string[]): Promise<SourcedJob[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || jobs.length === 0) return jobs;

  const payload = jobs.map((job, index) => ({
    id: index,
    title: job.title,
    description: tidy(job.description, 1200),
  }));

  const prompt = `For each job posting below, list the 3-6 most important skills that are required or preferred — stated outright or clearly implied by the text. Use the wording a recruiter would use (e.g. "VHDL", "stakeholder communication"). Do not invent skills the posting gives no basis for.

Return strict JSON: {"jobs":[{"id":0,"skills":["",""]}]}

Postings:
${JSON.stringify(payload)}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`skill extraction failed [${response.status}]: ${detail}`);
      notes.push("Could not read the skills out of every posting.");
      return jobs;
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as {
      jobs?: { id?: number; skills?: string[] }[];
    };
    const bySlot = new Map<number, string[]>();
    for (const row of parsed.jobs ?? []) {
      if (typeof row.id !== "number" || !Array.isArray(row.skills)) continue;
      const skills = row.skills
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 6);
      if (skills.length > 0) bySlot.set(row.id, skills);
    }
    return jobs.map((job, index) => {
      const skills = bySlot.get(index);
      return skills ? { ...job, required_skills: skills } : job;
    });
  } catch (error) {
    console.error("skill extraction failed", error);
    return jobs;
  }
}

// ------------------------------------------------------------------ export

export const jobSearchSchema = inputSchema;

/** Runs the whole sourcing pipeline: live boards first, labelled examples last. */
export async function runJobSearch(data: z.infer<typeof inputSchema>): Promise<JobSearchResult> {
  const notes: string[] = [];
  const terms = topTerms(data.skills, data.interests, data.drawnTo);

  const targetLevel = data.targetLevel ?? deriveTargetLevel(data.skills, data.recentRole);
  const levelUnclear = !data.targetLevel && targetLevel === null;

  const [adzuna, swiss] = await Promise.all([
    searchAdzuna(terms, data.locations, notes, targetLevel),
    searchSwissBoards(terms, data.locations, notes, targetLevel),
  ]);

  const live = [...swiss, ...adzuna];

  const ranked = rankJobs(live, {
    skills: data.skills,
    interests: [...data.interests, data.drawnTo].filter(Boolean),
    setups: data.setups,
    locations: data.locations,
    count: data.count,
    targetLevel,
  });

  // Only the shortlist gets the LLM pass — scoring already ran on raw text.
  const shortlist = await extractRequiredSkills(ranked.jobs, notes);

  if (shortlist.length >= 3) {
    const sources = Array.from(new Set(shortlist.map((j) => j.source)));
    return {
      jobs: shortlist,
      sources,
      examplesOnly: false,
      widened: ranked.widened,
      targetLevel,
      levelUnclear,
      notes,
    };
  }

  const examples = await exampleRoles(
    terms,
    data.drawnTo,
    data.locations,
    data.setups,
    data.count - shortlist.length,
    notes,
    targetLevel,
  );
  const jobs = [...shortlist, ...examples].slice(0, data.count);
  return {
    jobs,
    sources: Array.from(new Set(jobs.map((j) => j.source))),
    examplesOnly: jobs.length > 0 && jobs.every((j) => j.is_example),
    widened: ranked.widened,
    targetLevel,
    levelUnclear,
    notes,
  };
}
