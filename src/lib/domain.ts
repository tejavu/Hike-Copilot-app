export type SkillConfidence = { name: string; level: number };

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  photo_url: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  location: string | null;
  phone: string | null;
  /** Public LinkedIn profile URL, shown on the CV contact line. */
  linkedin: string | null;
  /** Other links she wants on the CV — portfolio, GitHub, personal site. */
  websites: WebsiteLink[] | null;
  interests: string[];
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: string[];
  projects: ProjectEntry[];
  languages: LanguageEntry[];
  goal: string | null;
  /** Optional, user-written one-liner shown under the CV header. */
  summary: string | null;
  timeline: string | null;
  timeline_months: number | null;
  onboarding_stage: string;
  onboarding_complete: boolean;
  roadmap_generated: boolean;
  /** Broad interest signal in her own words — seeds the job sweep. */
  drawn_to: string | null;
  location_pref: string | null;
  work_setup: string[];
  work_auth: string | null;
  recent_role: string | null;
  weekly_hours: number | null;
  skill_confidence: SkillConfidence[];
};

export type EducationEntry = { title: string; institution?: string; period?: string };
export type ExperienceEntry = {
  title: string;
  company?: string;
  period?: string;
  detail?: string;
  /** Where the role was based, e.g. "Geneva, Switzerland". */
  location?: string;
  /** What she actually did there — one achievement per line. */
  bullets?: string[];
};
export type WebsiteLink = { label: string; url: string };
export type LanguageEntry = { name: string; level: string };
export type ProjectEntry = { title: string; detail?: string; period?: string; url?: string };

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
  /** Link to the original posting, when it came from a live board. */
  url?: string | null;
  /** Where it came from: "Adzuna", "jobs.ch", "jobup.ch" or "Example". */
  source?: string | null;
  /** True for AI-written example roles — never presented as real openings. */
  is_example?: boolean | null;
};

export type ApplicationStatus = "not_applied" | "applied" | "interviewing" | "offer" | "rejected";

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "not_applied", label: "Not applied yet" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
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
  /** Rough time this step takes, in hours. Null on older rows. */
  estimated_hours?: number | null;
};

/** Consistent fallback estimate when a row has no stored value. */
export function itemHours(item: RoadmapItem): number {
  if (typeof item.estimated_hours === "number" && item.estimated_hours > 0) return item.estimated_hours;
  switch (item.item_type) {
    case "learn":
      return 3;
    case "practice":
      return Math.min(12, Math.max(1, (item.target_count ?? 1) * 0.5));
    case "build":
      return 5;
    case "certify":
      return 2;
    case "visibility":
      return 1.5;
    default:
      return 2;
  }
}

/** Order steps are meant to be tackled in within one skill. */
export const ITEM_TYPE_ORDER: Record<ItemType, number> = {
  learn: 0,
  practice: 1,
  build: 2,
  certify: 3,
  visibility: 4,
};


export function isItemComplete(item: RoadmapItem): boolean {
  if (item.item_type === "practice") {
    const target = item.target_count ?? 1;
    return item.progress_count >= target;
  }
  if (
    item.item_type === "certify" ||
    item.item_type === "build" ||
    item.item_type === "visibility"
  ) {
    return item.done && Boolean(item.proof_url || item.proof_path);
  }
  return item.done;
}

export function skillProgress(items: RoadmapItem[]): { done: number; total: number; pct: number } {
  const total = items.length;
  const done = items.filter(isItemComplete).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
