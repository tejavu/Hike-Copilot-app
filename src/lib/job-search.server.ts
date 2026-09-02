import { z } from "zod";
import { rankJobs, type SourcedJob } from "./job-sweep";

const inputSchema = z.object({
  skills: z.array(z.object({ name: z.string(), level: z.number() })).default([]),
  interests: z.array(z.string()).default([]),
  drawnTo: z.string().default(""),
  locations: z.array(z.string()).default([]),
  setups: z.array(z.string()).default([]),
  count: z.number().min(1).max(12).default(6),
});

export type JobSearchResult = {
  jobs: SourcedJob[];
  sources: string[];
  /** True when every returned role is an AI-written example, not a live posting. */
  examplesOnly: boolean;
  /** True when the city filter had to be relaxed to find anything. */
  widened: boolean;
  notes: string[];
};

/** Adzuna country codes we can actually query. */
const ADZUNA_COUNTRIES: Record<string, string> = {
  CH: "ch",
  DE: "de",
  AT: "at",
  NL: "nl",
  FR: "fr",
  BE: "be",
  IE: "gb",
  UK: "gb",
  GB: "gb",
  ES: "es",
  IT: "it",
  PL: "pl",
};

function countryOf(location: string): string | null {
  const code = location.split(",").pop()?.trim().toUpperCase() ?? "";
  return ADZUNA_COUNTRIES[code] ?? null;
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

/** Pull the terms we searched for back out of a posting so cards show real tags. */
function skillsFrom(text: string, terms: string[]): string[] {
  const value = text.toLowerCase();
  const found = terms.filter((term) => value.includes(term.toLowerCase()));
  return found.length > 0 ? found.slice(0, 6) : terms.slice(0, 4);
}

// ------------------------------------------------------------------ Adzuna

async function searchAdzuna(
  terms: string[],
  locations: string[],
  notes: string[],
): Promise<SourcedJob[]> {
  const appId = process.env["ADZUNA_APP_ID"];
  const appKey = process.env["ADZUNA_APP_KEY"];
  if (!appId || !appKey) {
    notes.push("Adzuna is not configured yet.");
    return [];
  }
  if (terms.length === 0) return [];

  const targets = locations.length > 0 ? locations : ["Zurich, CH"];
  const queries = new Map<string, string | null>();
  for (const location of targets) {
    const country = countryOf(location);
    if (!country) continue;
    queries.set(`${country}|${cityName(location)}`, cityName(location));
  }
  // Remote-friendly sweep so people open to remote aren't limited to one city.
  queries.set("gb|", null);

  // Sequential with a short pause — Adzuna rate-limits burst requests.
  const results: SourcedJob[][] = [];
  for (const [key, where] of queries.entries()) {
    if (results.length > 0) await new Promise((r) => setTimeout(r, 400));
    results.push(
      await (async () => {
      const country = key.split("|")[0]!;
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "20");
      url.searchParams.set("what_or", terms.join(" "));
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
    const rows: Row[] = Array.isArray(body.data)
      ? body.data
      : (body.data?.web ?? body.web ?? []);
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
): Promise<SourcedJob[]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return [];

  const prompt = `A woman in tech is job hunting. Her strongest skills: ${terms.join(", ") || "unspecified"}.
She is drawn to: ${drawnTo || "unspecified"}. Preferred locations: ${locations.join(", ") || "flexible"}. Work setup: ${setups.join(", ") || "flexible"}.

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

// ------------------------------------------------------------------ export

export const jobSearchSchema = inputSchema;

/** Runs the whole sourcing pipeline: live boards first, labelled examples last. */
export async function runJobSearch(data: z.infer<typeof inputSchema>): Promise<JobSearchResult> {

    const notes: string[] = [];
    const terms = topTerms(data.skills, data.interests, data.drawnTo);

    const [adzuna, swiss] = await Promise.all([
      searchAdzuna(terms, data.locations, notes),
      searchSwissBoards(terms, data.locations, notes),
    ]);

    const live = [...swiss, ...adzuna];
    const ranked = rankJobs(live, {
      skills: data.skills,
      interests: [...data.interests, data.drawnTo].filter(Boolean),
      setups: data.setups,
      locations: data.locations,
      count: data.count,
    });

    if (ranked.jobs.length >= 3) {
      const sources = Array.from(new Set(ranked.jobs.map((j) => j.source)));
      return { jobs: ranked.jobs, sources, examplesOnly: false, widened: ranked.widened, notes };
    }

    const examples = await exampleRoles(
      terms,
      data.drawnTo,
      data.locations,
      data.setups,
      data.count - ranked.jobs.length,
      notes,
    );
    const jobs = [...ranked.jobs, ...examples].slice(0, data.count);
    return {
      jobs,
      sources: Array.from(new Set(jobs.map((j) => j.source))),
      examplesOnly: jobs.length > 0 && jobs.every((j) => j.is_example),
      widened: ranked.widened,
      notes,
    };
}
