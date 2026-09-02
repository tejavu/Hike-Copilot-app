// Domain types + pure helpers for Mentor Match.

import { coordsForLocation, distanceKm } from "@/lib/events";

export type MeetingPref = "remote" | "in_person" | "either";

export type MentorSlotSpec = { dow: number; hour: number; minutes: number };

export type Mentor = {
  id: string;
  external_id: string;
  full_name: string;
  title: string;
  company: string;
  bio: string;
  expertise: string[];
  role_track: string;
  seniority: string;
  languages: string[];
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  meeting_pref: MeetingPref;
  availability_summary: string;
  topics: string[];
  community: string | null;
  years_experience: number;
  slots: MentorSlotSpec[];
  is_demo: boolean;
  contact_email: string | null;
};

export type ReminderCadence = "monthly" | "six_weeks" | "off";

export type TimeOfDay = "any" | "morning" | "afternoon" | "evening";

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  any: "Any time that's open",
  morning: "Mornings (before 12:00)",
  afternoon: "Afternoons (12:00–17:00)",
  evening: "Evenings (after 17:00)",
};

export type MentorPreferences = {
  user_id: string;
  goal: string | null;
  target_role: string | null;
  priority_skills: string[];
  guidance_style: string | null;
  language: string | null;
  location_pref: MeetingPref;
  availability_notes: string | null;
  session_focus: string | null;
  reminder_cadence: ReminderCadence;
  next_check_in_at: string | null;
  reminder_pending: boolean;
  selected_mentor_id: string | null;
  completed_at: string | null;
  preferred_time_of_day: TimeOfDay | null;
  timezone: string | null;
};

export type MatchStatus = "suggested" | "shortlisted" | "selected" | "passed";

export type MentorMatch = {
  id: string;
  mentor_id: string;
  score: number;
  reasons: string[];
  matched_attributes: string[];
  status: MatchStatus;
};

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type MentorSession = {
  id: string;
  mentor_id: string;
  starts_at: string;
  ends_at: string;
  theme: string;
  agenda: string | null;
  prep_questions: string[];
  status: SessionStatus;
  recap: string | null;
  key_advice: string | null;
  recap_source: string;
  next_check_in_at: string | null;
  created_at: string;
  email_status: EmailStatus;
  email_detail: string | null;
  email_sent_at: string | null;
  meeting_format: string;
};

/** Delivery state of the booking confirmation email for a session. */
export type EmailStatus = "pending" | "sent" | "not_configured" | "failed";

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  pending: "Not sent yet",
  sent: "Confirmation email sent",
  not_configured: "Email sending not configured",
  failed: "Email couldn't be sent",
};

export type SessionFeedback = {
  id: string;
  session_id: string;
  mentor_id: string | null;
  attended: boolean;
  rating: number | null;
  helpful: string | null;
  comments: string | null;
  continue_with_mentor: boolean;
  followup_request: string | null;
  created_at: string;
};

export type MentorAction = {
  id: string;
  session_id: string | null;
  mentor_id: string | null;
  title: string;
  detail: string | null;
  done: boolean;
  due_date: string | null;
  roadmap_item_id: string | null;
  created_at: string;
};

/* --------------------------------- labels --------------------------------- */

export const GUIDANCE_STYLES = [
  { value: "accountability", label: "Regular accountability", hint: "Short, frequent nudges to keep me moving" },
  { value: "technical", label: "Technical depth", hint: "Code, architecture and skill feedback" },
  { value: "strategy", label: "Career strategy", hint: "Which roles, which moves, which trade-offs" },
  { value: "confidence", label: "Confidence & visibility", hint: "Being seen and taken seriously" },
  { value: "interviews", label: "Interview practice", hint: "Mock interviews and story-telling" },
] as const;

export const MEETING_PREF_LABELS: Record<MeetingPref, string> = {
  remote: "Remote",
  in_person: "In person",
  either: "Either works",
};

export const CADENCE_LABELS: Record<ReminderCadence, string> = {
  monthly: "Every month",
  six_weeks: "Every 6 weeks",
  off: "No reminders",
};

export const CADENCE_DAYS: Record<ReminderCadence, number | null> = {
  monthly: 30,
  six_weeks: 42,
  off: null,
};

export function nextCheckInFrom(from: Date, cadence: ReminderCadence): string | null {
  const days = CADENCE_DAYS[cadence];
  if (days == null) return null;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

/* -------------------------------- matching -------------------------------- */

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]/g, "");

export type MatchResult = {
  mentor: Mentor;
  /** 0–100 compatibility guide, based only on stated preferences. */
  score: number;
  reasons: string[];
  matchedAttributes: string[];
  matchedSkills: string[];
  distance: number | null;
};

export type MatchInput = {
  prioritySkills: string[];
  targetRole: string | null;
  language: string | null;
  locationPref: MeetingPref;
  userLocation: string | null;
  guidanceStyle: string | null;
  availabilityNotes: string | null;
};

function roleAffinity(mentor: Mentor, targetRole: string | null): number {
  if (!targetRole) return 0;
  const needle = norm(targetRole);
  if (!needle) return 0;
  const track = norm(mentor.role_track);
  if (track.includes(needle) || needle.includes(track)) return 1;
  const words = targetRole
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 3);
  const haystack = norm(`${mentor.role_track} ${mentor.title} ${mentor.expertise.join(" ")}`);
  const hits = words.filter((word) => haystack.includes(norm(word))).length;
  if (hits === 0) return 0;
  return Math.min(0.8, hits * 0.35);
}

function styleAffinity(mentor: Mentor, style: string | null): number {
  if (!style) return 0;
  const topics = norm(mentor.topics.join(" ") + mentor.expertise.join(" ") + mentor.bio);
  const map: Record<string, string[]> = {
    accountability: ["checkin", "learningplans", "accountab", "plan"],
    technical: ["review", "code", "architecture", "portfolio", "system"],
    strategy: ["career", "promotion", "negotiation", "strategy", "switch"],
    confidence: ["imposter", "visibility", "confidence", "seen", "returning"],
    interviews: ["interview", "case", "takehome", "mock"],
  };
  const needles = map[style] ?? [];
  return needles.some((needle) => topics.includes(needle)) ? 1 : 0;
}

export function matchMentor(mentor: Mentor, input: MatchInput): MatchResult {
  const priority = input.prioritySkills.map(norm).filter(Boolean);
  const matchedSkills = mentor.expertise.filter((skill) => priority.includes(norm(skill)));
  const skillRatio = priority.length === 0 ? 0 : Math.min(1, matchedSkills.length / Math.min(3, priority.length));

  const role = roleAffinity(mentor, input.targetRole);

  const languageMatch = Boolean(
    input.language && mentor.languages.some((lang) => norm(lang) === norm(input.language!)),
  );

  const home = coordsForLocation(input.userLocation);
  const distance = home ? distanceKm({ lat: home.lat, lng: home.lng }, mentor) : null;

  let formatScore = 0.5;
  if (input.locationPref === "either") formatScore = 1;
  else if (input.locationPref === mentor.meeting_pref) formatScore = 1;
  else if (mentor.meeting_pref === "either") formatScore = 0.85;
  else if (input.locationPref === "remote" && mentor.meeting_pref === "in_person") formatScore = 0.25;
  else if (input.locationPref === "in_person" && mentor.meeting_pref === "remote") formatScore = 0.35;

  let proximity = 0;
  if (input.locationPref !== "remote" && distance != null) {
    proximity = distance <= 40 ? 1 : distance <= 150 ? 0.6 : 0.2;
  } else if (input.locationPref === "remote") {
    proximity = 0.6;
  }

  const availability = mentor.slots.length >= 2 ? 1 : mentor.slots.length === 1 ? 0.6 : 0.2;
  const style = styleAffinity(mentor, input.guidanceStyle);
  const seniorityBonus = mentor.years_experience >= 8 ? 1 : 0.6;

  const raw =
    skillRatio * 38 +
    role * 20 +
    (languageMatch ? 12 : 0) +
    formatScore * 10 +
    proximity * 6 +
    availability * 6 +
    style * 5 +
    seniorityBonus * 3;

  const score = Math.max(28, Math.min(97, Math.round(raw)));

  const matchedAttributes: string[] = [];
  if (matchedSkills.length) matchedAttributes.push(...matchedSkills.slice(0, 4));
  if (role >= 0.8 && input.targetRole) matchedAttributes.push(mentor.role_track);
  if (languageMatch && input.language) matchedAttributes.push(input.language);
  if (input.locationPref !== "remote" && distance != null && distance <= 40 && mentor.city) {
    matchedAttributes.push(mentor.city);
  }
  if (formatScore === 1) matchedAttributes.push(MEETING_PREF_LABELS[mentor.meeting_pref]);

  const reasons: string[] = [];
  if (matchedSkills.length) {
    reasons.push(
      `Works daily with ${matchedSkills.slice(0, 3).join(", ")} — the gap${matchedSkills.length > 1 ? "s" : ""} you flagged as priority.`,
    );
  }
  if (role >= 0.8 && input.targetRole) {
    reasons.push(`Already sitting in ${mentor.role_track}, which is where you're heading.`);
  } else if (role > 0) {
    reasons.push(`${mentor.title} at ${mentor.company} — adjacent to your target role.`);
  }
  if (languageMatch && input.language) {
    reasons.push(`Comfortable mentoring in ${input.language}.`);
  }
  if (input.locationPref !== "remote" && distance != null && distance <= 40 && mentor.city) {
    reasons.push(`Based in ${mentor.city}, so meeting in person is realistic.`);
  } else if (input.locationPref === "remote" || mentor.meeting_pref === "remote") {
    reasons.push("Mentors remotely, so location isn't a constraint.");
  }
  if (style === 1 && input.guidanceStyle) {
    const label = GUIDANCE_STYLES.find((option) => option.value === input.guidanceStyle)?.label;
    if (label) reasons.push(`Regularly coaches on ${label.toLowerCase()}.`);
  }
  if (reasons.length === 0) {
    reasons.push(
      `${mentor.years_experience} years in ${mentor.role_track} — broad perspective even though your stated priorities differ.`,
    );
  }

  return { mentor, score, reasons: reasons.slice(0, 4), matchedAttributes: [...new Set(matchedAttributes)], matchedSkills, distance };
}

export function rankMentors(mentors: Mentor[], input: MatchInput): MatchResult[] {
  return mentors
    .map((mentor) => matchMentor(mentor, input))
    .sort((a, b) => b.score - a.score || a.mentor.full_name.localeCompare(b.mentor.full_name));
}

/**
 * Hike Copilot picks the single best-fit mentor rather than asking the mentee to choose.
 * Mentors already declined via a rematch are skipped; mentors with no upcoming
 * openings are only used as a last resort so bookable time is the default.
 */
export function pickBestMentor(
  mentors: Mentor[],
  input: MatchInput,
  options: { exclude?: string[]; timeOfDay?: TimeOfDay | null } = {},
): MatchResult | null {
  const exclude = new Set(options.exclude ?? []);
  const ranked = rankMentors(mentors, input).filter((row) => !exclude.has(row.mentor.id));
  if (ranked.length === 0) return null;
  const bookable = ranked.find(
    (row) => preferredSlots(row.mentor, options.timeOfDay ?? "any").length > 0,
  );
  return bookable ?? ranked[0]!;
}

/* ------------------------------- directory -------------------------------- */

export type DirectoryFilters = {
  query: string;
  expertise: string | "all";
  role: string | "all";
  language: string | "all";
  location: string | "all";
  meeting: MeetingPref | "all";
  availableOnly: boolean;
};

export const DEFAULT_DIRECTORY_FILTERS: DirectoryFilters = {
  query: "",
  expertise: "all",
  role: "all",
  language: "all",
  location: "all",
  meeting: "all",
  availableOnly: false,
};

export function directoryFacets(mentors: Mentor[]) {
  const expertise = new Set<string>();
  const roles = new Set<string>();
  const languages = new Set<string>();
  const locations = new Set<string>();
  for (const mentor of mentors) {
    mentor.expertise.forEach((item) => expertise.add(item));
    roles.add(mentor.role_track);
    mentor.languages.forEach((item) => languages.add(item));
    if (mentor.city) locations.add(mentor.city);
  }
  const sort = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return {
    expertise: sort(expertise),
    roles: sort(roles),
    languages: sort(languages),
    locations: sort(locations),
  };
}

export function filterMatches(rows: MatchResult[], filters: DirectoryFilters): MatchResult[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter(({ mentor }) => {
    if (query) {
      const haystack = [
        mentor.full_name,
        mentor.title,
        mentor.company,
        mentor.bio,
        mentor.role_track,
        ...mentor.expertise,
        ...mentor.topics,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.expertise !== "all" && !mentor.expertise.includes(filters.expertise)) return false;
    if (filters.role !== "all" && mentor.role_track !== filters.role) return false;
    if (filters.language !== "all" && !mentor.languages.includes(filters.language)) return false;
    if (filters.location !== "all" && mentor.city !== filters.location) return false;
    if (filters.meeting !== "all" && mentor.meeting_pref !== filters.meeting && mentor.meeting_pref !== "either") {
      return false;
    }
    if (filters.availableOnly && mentor.slots.length === 0) return false;
    return true;
  });
}

export function activeFilterCount(filters: DirectoryFilters): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.expertise !== "all") count += 1;
  if (filters.role !== "all") count += 1;
  if (filters.language !== "all") count += 1;
  if (filters.location !== "all") count += 1;
  if (filters.meeting !== "all") count += 1;
  if (filters.availableOnly) count += 1;
  return count;
}

/* ------------------------------ availability ------------------------------ */

export type SessionSlot = { start: Date; end: Date; minutes: number };

/**
 * Turns a mentor's recurring seeded availability into concrete upcoming slots.
 * Real availability from a mentor calendar would replace this function only.
 */
export function upcomingSlots(mentor: Mentor, weeks = 3, from = new Date()): SessionSlot[] {
  const slots: SessionSlot[] = [];
  for (let week = 0; week < weeks; week += 1) {
    for (const spec of mentor.slots) {
      const base = new Date(from);
      base.setHours(spec.hour, 0, 0, 0);
      const delta = (spec.dow - base.getDay() + 7) % 7;
      base.setDate(base.getDate() + delta + week * 7);
      if (base.getTime() < from.getTime() + 3_600_000) continue;
      slots.push({
        start: base,
        end: new Date(base.getTime() + spec.minutes * 60_000),
        minutes: spec.minutes,
      });
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 8);
}

function inTimeOfDay(slot: SessionSlot, timeOfDay: TimeOfDay): boolean {
  const hour = slot.start.getHours();
  if (timeOfDay === "morning") return hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  if (timeOfDay === "evening") return hour >= 17;
  return true;
}

/**
 * Openings that fit the mentee's stated time-of-day preference. Falls back to
 * every opening when nothing matches, so she is never left without a time.
 */
export function preferredSlots(
  mentor: Mentor,
  timeOfDay: TimeOfDay | null = "any",
  from = new Date(),
): SessionSlot[] {
  const all = upcomingSlots(mentor, 3, from);
  if (!timeOfDay || timeOfDay === "any") return all;
  const filtered = all.filter((slot) => inTimeOfDay(slot, timeOfDay));
  return filtered.length > 0 ? filtered : all;
}

/* -------------------------------- calendar -------------------------------- */

function icsStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeIcs(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildSessionIcs(session: MentorSession, mentor: Mentor): string {
  const start = new Date(session.starts_at);
  const end = new Date(session.ends_at);
  const description = [
    `Mentoring session with ${mentor.full_name} (${mentor.title}, ${mentor.company}).`,
    session.theme ? `Focus: ${session.theme}` : "",
    session.agenda ?? "",
    session.prep_questions.length ? `Questions:\n- ${session.prep_questions.join("\n- ")}` : "",
    "Booked through Hike Copilot. Add the meeting link once your mentor confirms it.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hike Copilot//MentorMatch//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${session.id}@ada-mentor`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${escapeIcs(`Mentoring: ${mentor.full_name}`)}`,
    `LOCATION:${escapeIcs(mentor.meeting_pref === "in_person" ? [mentor.city, mentor.country].filter(Boolean).join(", ") : "Online")}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* --------------------------------- display -------------------------------- */

export function formatSlot(date: Date | string): string {
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeDays(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return "yesterday";
  return `${Math.abs(diff)} days ago`;
}

/* ----------------------------- prep fallback ------------------------------ */

export type PrepContext = {
  mentor: Mentor;
  goal: string | null;
  targetRole: string | null;
  prioritySkills: string[];
  builds: string[];
  certifications: string[];
  eventTakeaways: string[];
  sessionFocus: string | null;
};

/** Deterministic prep used when the AI call is unavailable — never a dead end. */
export function fallbackPrep(context: PrepContext): { agenda: string; questions: string[] } {
  const skill = context.prioritySkills[0] ?? "the skills on my roadmap";
  const questions = [
    `I'm working toward ${context.targetRole ?? context.goal ?? "a role change"}. Looking at where I am now, what would you prioritise in the next six weeks?`,
    `How did you actually get fluent in ${skill}, and what did you skip that turned out not to matter?`,
    context.builds.length
      ? `I built ${context.builds[0]}. What would you push me to add before I put it in front of a hiring manager?`
      : "What kind of portfolio project would make someone at your company take me seriously?",
    context.certifications.length
      ? `I've completed ${context.certifications[0]}. Does that carry weight on your team, or is there something more useful?`
      : "Which certifications or credentials genuinely matter for this path, and which are noise?",
    "When you look at applications like mine, what makes you think 'not ready yet' — and what changes that?",
    context.eventTakeaways.length
      ? `At a recent community event I took away: "${context.eventTakeaways[0]}". Does that match your experience?`
      : "Where do you meet the people who end up shaping your career, and how do I get into those rooms?",
  ];

  const agenda = [
    `Focus: ${context.sessionFocus || `${skill} and the path to ${context.targetRole ?? "my next role"}`}`,
    "",
    "1. Quick intro — where I am and what I'm building (5 min)",
    `2. Feedback on my current plan for ${skill} (15 min)`,
    "3. What you'd do differently in my position (15 min)",
    "4. One concrete next step + how we check in (10 min)",
  ].join("\n");

  return { agenda, questions: questions.slice(0, 6) };
}
