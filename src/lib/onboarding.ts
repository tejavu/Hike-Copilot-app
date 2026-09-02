import type { SkillConfidence } from "./domain";

export type WeeklyOption = { hours: number; label: string };

export const WEEKLY_OPTIONS: WeeklyOption[] = [
  { hours: 3, label: "3 hours" },
  { hours: 6, label: "6 hours" },
  { hours: 10, label: "10 hours" },
  { hours: 15, label: "15 hours" },
  { hours: 20, label: "20+ hours" },
];

export function confidentSkills(skills: SkillConfidence[], minLevel = 3): string[] {
  return skills.filter((s) => s.level >= minLevel).map((s) => s.name);
}

export type DocumentPayload = {
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  text?: string;
};

export type DocumentReadResult = {
  unsupported: boolean;
  payload: DocumentPayload;
};

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "txt" || ext === "md") return "text/plain";
  return "application/octet-stream";
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function readDocumentFile(file: File): Promise<DocumentReadResult> {
  const mimeType = file.type || guessMime(file.name);

  if (mimeType.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
    return {
      unsupported: false,
      payload: { fileName: file.name, mimeType, text: await file.text() },
    };
  }

  if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
    return {
      unsupported: false,
      payload: { fileName: file.name, mimeType, dataUrl: await toDataUrl(file) },
    };
  }

  return {
    unsupported: true,
    payload: { fileName: file.name, mimeType },
  };
}
