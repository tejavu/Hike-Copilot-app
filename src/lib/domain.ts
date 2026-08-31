export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  photo_url: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  location: string | null;
  phone: string | null;
  interests: string[];
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: string[];
  goal: string | null;
  timeline: string | null;
  timeline_months: number | null;
  onboarding_stage: string;
  onboarding_complete: boolean;
  roadmap_generated: boolean;
};

export type EducationEntry = { title: string; institution?: string; period?: string };
export type ExperienceEntry = { title: string; company?: string; period?: string; detail?: string };

export type ChatMessage = {
  id: string;
  user_id: string;
  role: "assistant" | "user";
  content: string;
  kind: "text" | "path_choice" | "upload" | "jobs" | "gap" | "roadmap_ready";
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  required_skills: string[];
  seniority: string | null;
  liked: boolean | null;
  application_status: ApplicationStatus;
};

export type ApplicationStatus = "not_applied" | "applied" | "interviewing" | "offer";

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "not_applied", label: "Not applied yet" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
];

export type PhaseKind = "learning" | "building" | "applying" | "visibility";

export type RoadmapPhase = {
  id: string;
  name: string;
  kind: PhaseKind;
  blurb: string | null;
  order_index: number;
};

export type RoadmapSkill = {
  id: string;
  phase_id: string;
  name: string;
  order_index: number;
};

export type ItemType = "learn" | "practice" | "certify" | "build" | "visibility";

export type RoadmapItem = {
  id: string;
  skill_id: string;
  item_type: ItemType;
  title: string;
  provider: string | null;
  url: string | null;
  difficulty: string | null;
  detail: string | null;
  target_count: number | null;
  progress_count: number;
  done: boolean;
  proof_url: string | null;
  proof_path: string | null;
  order_index: number;
};

export function isItemComplete(item: RoadmapItem): boolean {
  if (item.item_type === "practice") {
    const target = item.target_count ?? 1;
    return item.progress_count >= target;
  }
  if (item.item_type === "certify" || item.item_type === "build" || item.item_type === "visibility") {
    return item.done && Boolean(item.proof_url || item.proof_path);
  }
  return item.done;
}

export function skillProgress(items: RoadmapItem[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter(isItemComplete).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
