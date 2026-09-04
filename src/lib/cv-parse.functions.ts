import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

export type ParsedCv = {
  full_name: string | null;
  interests: string[];
  skills: string[];
  education: { title: string }[];
  experience: { title: string }[];
  projects: { title: string }[];
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
{"full_name":string|null,"interests":string[],"skills":string[],"education":string[],"experience":string[],"projects":string[],"certifications":string[],"summary":string}
Rules:
- skills: concrete tools, languages, frameworks, methods (max 15).
- interests: tech areas the person clearly leans toward, e.g. "frontend", "data science", "cloud" (max 6). Infer from their work if not stated.
- education: one string per entry, "Degree, Field — Institution (year)".
- experience: one string per role, "Title — Organisation (dates)".
- projects: personal, academic or side projects (including a dedicated Projects/Portfolio section), one string per project, "Title — one line on what it did/achieved (dates if given)" (max 8).
- certifications: certificate/course names only (max 10).
- summary: one warm sentence (max 30 words) describing what you read.
- Use [] when nothing is found. Never invent facts.`;

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
      education: toStringList(obj["education"], 6).map((title) => ({ title })),
      experience: toStringList(obj["experience"], 8).map((title) => ({ title })),
      projects: toStringList(obj["projects"], 8).map((title) => ({ title })),
      certifications: toStringList(obj["certifications"], 10),
      summary: typeof obj["summary"] === "string" ? obj["summary"].trim() : null,
    };

    return { parsed, error: null };
  });
