import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseEntryLine } from "./cv-entry";
import { classifyEmployment, toEmploymentType } from "./experience-weight";

const fileSchema = z.object({
  fileName: z.string().min(1).max(300),
  mimeType: z.string().min(1).max(200),
  /** Base64 data URL for PDFs/images, or plain text for text files. */
  dataUrl: z.string().max(9_000_000).optional(),
  text: z.string().max(200_000).optional(),
});

const schema = z.object({
  files: z.array(fileSchema).min(1).max(5),
});

export type ParsedEducation = { title: string; institution?: string; period?: string };
export type ParsedExperience = {
  title: string;
  company?: string;
  period?: string;
  detail?: string;
  location?: string;
  bullets?: string[];
  /** full_time | working_student | internship. */
  employment_type?: string;
};
export type ParsedProject = { title: string; detail?: string; period?: string; url?: string };

export type ParsedCv = {
  full_name: string | null;
  interests: string[];
  skills: string[];
  education: ParsedEducation[];
  experience: ParsedExperience[];
  projects: ParsedProject[];
  certifications: string[];
  summary: string | null;
};

const EMPTY: ParsedCv = {
  full_name: null,
  interests: [],
  skills: [],
  education: [],
  experience: [],
  projects: [],
  certifications: [],
  summary: null,
};

const SYSTEM = `You extract structured career data from uploaded documents (CVs, transcripts, certificates).
Return ONLY minified JSON, no prose, no markdown fences, matching exactly:
{"full_name":string|null,"interests":string[],"skills":string[],"education":[{"title":string,"institution":string,"period":string}],"experience":[{"title":string,"company":string,"period":string,"location":string,"employment_type":"full_time"|"working_student"|"internship","detail":string,"bullets":string[]}],"projects":[{"title":string,"detail":string,"period":string,"url":string}],"certifications":string[],"summary":string}
Rules:
- skills: concrete tools, languages, frameworks, methods (max 15).
- interests: tech areas the person clearly leans toward, e.g. "frontend", "data science", "cloud" (max 6). Infer from their work if not stated.
- education: title is the degree and field, institution is the school, period is the dates exactly as written (e.g. "2021 – 2023").
- experience: EVERY paid role, internship, working-student job, apprenticeship, research assistantship and volunteer role in the document — never skip internships, and never merge two roles into one. title is the job title only, company is the employer only, period is the dates only, detail is one short line summarising the role. location is the city and country of the role if printed. bullets is 2-4 short lines taken from the document describing what was actually done and achieved there — keep the person's own facts, numbers, tools and outcomes, rewritten concisely in third-person-free plain style (start with a verb, no "I"). Never invent bullets; if the document gives none for that role, return [].
- employment_type: classify each role. "internship" for internships and traineeships in any language (intern, Praktikum, Praktikant/in, stage, stagiaire, tirocinio, stagista, becario). "working_student" for working-student, part-time, apprenticeship or student-assistant roles (working student, Werkstudent/in, Teilzeit, studentische Hilfskraft, HiWi, temps partiel, tempo parziale, apprenti, Lehrling, research/teaching assistant, tutor). "full_time" otherwise. Judge from the job title, the employer line and the document's own wording — never guess from the field of work.
- projects: personal, academic or side projects (max 8). title is the project name only, detail is one line on what it did/achieved, period is the dates, url only if a link is printed.
- Keep dates out of title/company/institution fields — they belong in period.
- certifications: certificate/course names only (max 10).
- summary: one warm sentence (max 30 words) describing what you read.
- Use [] or "" when nothing is found. Never invent facts.`;


type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

function toStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 1)
    .slice(0, limit);
}

/**
 * The model sometimes answers with plain strings instead of objects, so both
 * shapes are accepted and normalised into the structured entry we store.
 */
type EntryValue = string | string[] | undefined;

function toEntryList<T extends Record<string, EntryValue>>(
  value: unknown,
  limit: number,
  fromString: (line: string) => T,
  fromObject: (obj: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 1) out.push(fromString(item.trim()));
    else if (item && typeof item === "object") {
      const entry = fromObject(item as Record<string, unknown>);
      if (typeof entry["title"] === "string" && entry["title"].trim()) out.push(entry);
    }
    if (out.length >= limit) break;
  }
  return out;
}

function str(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === "string" ? value.trim() : "";
}

function clean<T extends Record<string, EntryValue>>(entry: T): T {
  const out = {} as Record<string, string | string[]>;
  for (const [key, value] of Object.entries(entry)) {
    if (Array.isArray(value)) {
      if (value.length) out[key] = value;
    } else if (value) out[key] = value;
  }
  return out as T;
}

/** Achievement lines under a role: trimmed, de-bulleted, at most four. */
function toBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.replace(/^[-•*\s]+/, "").trim() : ""))
    .filter((item) => item.length > 3)
    .slice(0, 4);
}

/**
 * Reads uploaded documents with the AI gateway and returns profile fields so
 * onboarding doesn't ask for things the CV already says.
 */
export const parseCvDocuments = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<{ parsed: ParsedCv; error: string | null }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { parsed: EMPTY, error: "Document reading isn't configured right now." };
    }

    const blocks: Block[] = [
      { type: "text", text: "Extract the career profile from the attached document(s)." },
    ];

    for (const file of data.files) {
      if (file.text) {
        blocks.push({ type: "text", text: `--- ${file.fileName} ---\n${file.text.slice(0, 60_000)}` });
        continue;
      }
      if (!file.dataUrl) continue;
      if (file.mimeType.startsWith("image/")) {
        blocks.push({ type: "image_url", image_url: { url: file.dataUrl } });
      } else if (file.mimeType === "application/pdf") {
        blocks.push({ type: "file", file: { filename: file.fileName, file_data: file.dataUrl } });
      }
    }

    if (blocks.length === 1) {
      return {
        parsed: EMPTY,
        error:
          "I can read PDFs, images and plain text. Word files I can't open yet — export as PDF and I'll take it from there.",
      };
    }

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: blocks },
          ],
        }),
      });
    } catch (error) {
      console.error("cv parse fetch failed", error);
      return { parsed: EMPTY, error: "I couldn't reach my reader just now." };
    }

    if (!response.ok) {
      const body = await response.text();
      console.error("cv parse gateway error", response.status, body);
      if (response.status === 429) {
        return { parsed: EMPTY, error: "I'm a bit overloaded — try that upload again in a moment." };
      }
      if (response.status === 402 || response.status === 403) {
        return { parsed: EMPTY, error: "My reading credits have run out, so I couldn't open your documents." };
      }
      return { parsed: EMPTY, error: "That document didn't open cleanly on my end." };
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1)) as Record<string, unknown>;
    } catch {
      console.error("cv parse invalid json", raw.slice(0, 400));
      return { parsed: EMPTY, error: "I read the file but couldn't make sense of it — want to answer a few questions instead?" };
    }

    const parsed: ParsedCv = {
      full_name: typeof obj["full_name"] === "string" && obj["full_name"].trim() ? obj["full_name"].trim() : null,
      interests: toStringList(obj["interests"], 6),
      skills: toStringList(obj["skills"], 15),
      education: toEntryList<ParsedEducation>(
        obj["education"],
        6,
        (line) => {
          const parts = parseEntryLine(line);
          return clean({ title: parts.title, institution: parts.org, period: parts.period });
        },
        (o) => clean({ title: str(o, "title"), institution: str(o, "institution"), period: str(o, "period") }),
      ),
      experience: toEntryList<ParsedExperience>(
        obj["experience"],
        10,
        (line) => {
          const parts = parseEntryLine(line);
          return clean({
            title: parts.title,
            company: parts.org,
            period: parts.period,
            detail: parts.detail,
            employment_type: classifyEmployment(line),
          });
        },
        (o) =>
          clean({
            title: str(o, "title"),
            company: str(o, "company"),
            period: str(o, "period"),
            location: str(o, "location"),
            detail: str(o, "detail"),
            employment_type:
              toEmploymentType(o["employment_type"]) ??
              classifyEmployment(str(o, "title"), str(o, "company"), str(o, "detail")),
            bullets: toBullets(o["bullets"]),
          }),
      ),
      projects: toEntryList<ParsedProject>(
        obj["projects"],
        8,
        (line) => {
          const parts = parseEntryLine(line);
          return clean({ title: parts.title, detail: [parts.org, parts.detail].filter(Boolean).join(" — "), period: parts.period });
        },
        (o) =>
          clean({
            title: str(o, "title"),
            detail: str(o, "detail"),
            period: str(o, "period"),
            url: str(o, "url"),
          }),
      ),
      certifications: toStringList(obj["certifications"], 10),
      summary: typeof obj["summary"] === "string" ? obj["summary"].trim() : null,
    };

    return { parsed, error: null };
  });
