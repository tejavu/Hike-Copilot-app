import type { Profile } from "./domain";

export type Stage =
  | "welcome"
  | "upload"
  | "q_interests"
  | "q_skills"
  | "q_education"
  | "q_quals"
  | "q_certs"
  | "jobs"
  | "gap"
  | "q_timeline"
  | "q_goal"
  | "done";

export const QUESTION_STAGES: Stage[] = [
  "q_interests",
  "q_skills",
  "q_education",
  "q_quals",
  "q_certs",
];

export const PROMPTS: Record<string, string> = {
  q_interests:
    "Let's start with the fun part. Which corners of tech genuinely pull you in? Anything from frontend to data to cloud — just name a few.",
  q_skills:
    "Lovely. Now, what can you already do? List the skills, tools or languages you'd be comfortable being asked about — and be generous with yourself, half-learned counts.",
  q_education:
    "What's your education background? A line is plenty — degree, field, and where you studied.",
  q_quals:
    "And your experience so far? Roles, internships, freelance, side projects — anything where you've done the work.",
  q_certs:
    "Any certifications or courses you've completed? If none yet, just say \"none\" — we'll add some to your roadmap.",
  q_timeline:
    "Now the practical bit: how long do you have? Something like \"3 months\", \"6 months\" or \"a year\" is perfect.",
  q_goal:
    "Last question, and it's the important one — what are you working toward? Say it in your own words.",
};

export function splitList(input: string): string[] {
  return input
    .split(/[,;\n]|\band\b|\/|·/gi)
    .map((part) => part.trim().replace(/^[-•*]\s*/, ""))
    .filter((part) => part.length > 1 && !/^none$/i.test(part))
    .slice(0, 12);
}

export function parseMonths(input: string): number {
  const text = input.toLowerCase();
  const number = Number(text.match(/\d+/)?.[0] ?? NaN);
  if (/year/.test(text)) return Number.isFinite(number) ? Math.round(number * 12) : 12;
  if (/week/.test(text) && Number.isFinite(number)) return Math.max(1, Math.round(number / 4));
  if (Number.isFinite(number)) return number;
  if (/asap|now|immediate/.test(text)) return 2;
  return 6;
}

export function nextQuestionStage(current: Stage, uploadedPath: boolean): Stage {
  const order: Stage[] = uploadedPath
    ? ["q_interests", "q_skills", "jobs"]
    : ["q_interests", "q_skills", "q_education", "q_quals", "q_certs", "jobs"];
  const index = order.indexOf(current);
  if (index === -1 || index === order.length - 1) return "jobs";
  return order[index + 1] as Stage;
}

export function firstName(profile: Profile | null | undefined): string {
  const name = profile?.full_name?.trim();
  if (!name) return "there";
  return name.split(/\s+/)[0] as string;
}
