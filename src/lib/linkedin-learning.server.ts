import { z } from "zod";

export const linkedInCourseSchema = z.object({
  skills: z.array(z.string().min(1)).min(1).max(8),
});

export type LinkedInCourse = { title: string; url: string };

/** Brief cache so a regenerated roadmap doesn't re-hit the search API. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; courses: LinkedInCourse[] }>();

/** Real course/learning-path pages only — not search or topic listings. */
function courseUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.hostname !== "www.linkedin.com") return null;
    const path = url.pathname.replace(/\/+$/, "");
    if (!path.startsWith("/learning/")) return null;
    const slug = path.slice("/learning/".length);
    if (!slug || slug.includes("/")) return null;
    if (/^(search|topics|subscription|me|instructors?)$/i.test(slug)) return null;
    return `https://www.linkedin.com${path}`;
  } catch {
    return null;
  }
}

function courseTitle(raw: string): string {
  return raw
    .replace(/\s*[|–-]\s*LinkedIn( Learning)?.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchOne(
  skill: string,
  headers: Record<string, string>,
): Promise<LinkedInCourse[]> {
  const cached = cache.get(skill.toLowerCase());
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.courses;

  const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: `site:linkedin.com/learning ${skill} course`, limit: 8 }),
  });
  if (!response.ok) {
    console.error(`linkedin learning search failed [${response.status}]: ${await response.text()}`);
    return [];
  }

  type Row = { url?: string; title?: string };
  const body = (await response.json()) as { data?: { web?: Row[] } | Row[]; web?: Row[] };
  const rows: Row[] = Array.isArray(body.data) ? body.data : (body.data?.web ?? body.web ?? []);

  const seen = new Set<string>();
  const courses: LinkedInCourse[] = [];
  for (const row of rows) {
    const url = courseUrl(row.url ?? "");
    const title = courseTitle(row.title ?? "");
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    courses.push({ title, url });
    if (courses.length === 2) break;
  }
  cache.set(skill.toLowerCase(), { at: Date.now(), courses });
  return courses;
}

/**
 * Finds real, titled LinkedIn Learning courses for each skill. Only URLs the
 * search actually returned are used — nothing is invented; skills with no
 * solid result are simply absent from the map so callers can fall back.
 */
export async function findLinkedInCourses(
  skills: string[],
): Promise<Record<string, LinkedInCourse[]>> {
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!gatewayKey || !connectionKey) return {};

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${gatewayKey}`,
    "X-Connection-Api-Key": connectionKey,
  };

  const result: Record<string, LinkedInCourse[]> = {};
  // Sequential with a short pause — one batched lookup per roadmap build.
  for (const skill of skills.slice(0, 8)) {
    if (Object.keys(result).length > 0) await new Promise((r) => setTimeout(r, 300));
    try {
      const courses = await searchOne(skill, headers);
      if (courses.length > 0) result[skill] = courses;
    } catch (error) {
      console.error("linkedin learning search failed", error);
    }
  }
  return result;
}
