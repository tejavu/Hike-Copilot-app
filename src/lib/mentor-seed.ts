// Seeded mentor directory for Mentor Match.
//
// These are transparent DEMO profiles, not live people. They exist so the
// matching, scheduling, prep and follow-up flows are usable end to end before a
// real volunteer-mentor programme is wired in. Every row carries `is_demo: true`
// and the UI labels the directory as demo data.
//
// When a real mentor intake (community partner, sponsor programme, internal
// volunteer form) is connected, insert rows in exactly this shape with
// `is_demo: false` and nothing else in the app has to change.

export type MentorSlot = {
  /** 0 = Sunday … 6 = Saturday */
  dow: number;
  /** Local hour, 24h */
  hour: number;
  minutes: number;
};

export type SeedMentor = {
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
  meeting_pref: "remote" | "in_person" | "either";
  availability_summary: string;
  topics: string[];
  community: string | null;
  years_experience: number;
  slots: MentorSlot[];
};

export const MENTOR_SEED: SeedMentor[] = [
  {
    external_id: "demo:mentor-lea-brunner",
    full_name: "Lea Brunner",
    title: "Staff Frontend Engineer",
    company: "Swisscom",
    bio: "Started in graphic design, retrained into frontend at 29, and now leads the design-system guild. I know exactly what it feels like to be the least technical person in the room and to grow out of that.",
    expertise: ["React", "TypeScript", "Design Systems", "Accessibility", "CSS"],
    role_track: "Frontend Engineering",
    seniority: "Staff",
    languages: ["German", "English"],
    city: "Zurich",
    country: "CH",
    lat: 47.3769,
    lng: 8.5417,
    meeting_pref: "either",
    availability_summary: "Tuesday and Thursday evenings, 45–60 min",
    topics: ["Career switching", "Portfolio review", "Frontend interviews", "Imposter feelings"],
    community: "Women in Tech Switzerland",
    years_experience: 11,
    slots: [
      { dow: 2, hour: 18, minutes: 45 },
      { dow: 4, hour: 19, minutes: 60 },
    ],
  },
  {
    external_id: "demo:mentor-nadia-haddad",
    full_name: "Nadia Haddad",
    title: "Senior Data Scientist",
    company: "Roche",
    bio: "I came from biology, taught myself Python on the night shift, and now build models in a regulated environment. Ask me about learning stats without a maths degree and about being taken seriously in review meetings.",
    expertise: ["Python", "Machine Learning", "SQL", "Statistics", "Data Visualization"],
    role_track: "Data Science",
    seniority: "Senior",
    languages: ["French", "English", "Arabic"],
    city: "Basel",
    country: "CH",
    lat: 47.5596,
    lng: 7.5886,
    meeting_pref: "either",
    availability_summary: "Wednesday lunchtimes and Saturday mornings",
    topics: ["Breaking into data", "Portfolio projects", "Technical storytelling", "Salary talks"],
    community: "PyLadies Basel",
    years_experience: 8,
    slots: [
      { dow: 3, hour: 12, minutes: 45 },
      { dow: 6, hour: 10, minutes: 60 },
    ],
  },
  {
    external_id: "demo:mentor-priya-raman",
    full_name: "Priya Raman",
    title: "Engineering Manager",
    company: "Google",
    bio: "Twelve years shipping backend systems, five of them managing. I mentor women who are being told they are 'not quite ready' — usually they are, and we build the evidence together.",
    expertise: ["Leadership", "System Design", "Go", "Kubernetes", "Career Growth"],
    role_track: "Engineering Leadership",
    seniority: "Manager",
    languages: ["English", "Hindi"],
    city: "Zurich",
    country: "CH",
    lat: 47.3769,
    lng: 8.5417,
    meeting_pref: "remote",
    availability_summary: "Monday mornings, 30 min focused calls",
    topics: ["Promotion cases", "Negotiation", "Managing up", "Interview strategy"],
    community: "Lean In Circles Zurich",
    years_experience: 12,
    slots: [
      { dow: 1, hour: 8, minutes: 30 },
      { dow: 1, hour: 9, minutes: 30 },
    ],
  },
  {
    external_id: "demo:mentor-sofia-marchetti",
    full_name: "Sofia Marchetti",
    title: "Cloud Platform Engineer",
    company: "Zühlke",
    bio: "Consultant turned platform engineer. I spend my days in AWS, Terraform and CI pipelines, and my evenings convincing career switchers that infrastructure is learnable in public.",
    expertise: ["AWS", "Terraform", "Docker", "CI/CD", "Cloud Architecture"],
    role_track: "Cloud & DevOps",
    seniority: "Senior",
    languages: ["Italian", "German", "English"],
    city: "Lugano",
    country: "CH",
    lat: 46.0037,
    lng: 8.9511,
    meeting_pref: "remote",
    availability_summary: "Thursday evenings, fortnightly",
    topics: ["Cloud certifications", "Homelab projects", "First DevOps role"],
    community: "Cloud Native Switzerland",
    years_experience: 9,
    slots: [
      { dow: 4, hour: 18, minutes: 60 },
      { dow: 2, hour: 20, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-mira-okonkwo",
    full_name: "Mira Okonkwo",
    title: "Product Manager",
    company: "Revolut",
    bio: "I moved from customer support to product in three years by writing down everything I noticed. If you are trying to prove product instincts without a product title yet, that is my favourite problem.",
    expertise: ["Product Management", "User Research", "Analytics", "Roadmapping", "SQL"],
    role_track: "Product",
    seniority: "Mid-senior",
    languages: ["English"],
    city: "London",
    country: "GB",
    lat: 51.5072,
    lng: -0.1276,
    meeting_pref: "remote",
    availability_summary: "Friday afternoons, 45 min",
    topics: ["Into product without a PM title", "Case interviews", "Stakeholder pushback"],
    community: "Women in Product",
    years_experience: 7,
    slots: [
      { dow: 5, hour: 15, minutes: 45 },
      { dow: 5, hour: 16, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-anouk-devries",
    full_name: "Anouk de Vries",
    title: "Backend Engineer",
    company: "Adyen",
    bio: "Bootcamp graduate in 2019, now on a payments core team. I remember every stage of the 'am I actually an engineer yet' spiral and I will walk you through yours honestly.",
    expertise: ["Java", "Python", "APIs", "Databases", "Testing"],
    role_track: "Backend Engineering",
    seniority: "Mid",
    languages: ["Dutch", "English"],
    city: "Amsterdam",
    country: "NL",
    lat: 52.3676,
    lng: 4.9041,
    meeting_pref: "remote",
    availability_summary: "Tuesday evenings, weekly",
    topics: ["Junior job search", "Code review nerves", "Bootcamp to first role"],
    community: "Codam Alumni",
    years_experience: 6,
    slots: [
      { dow: 2, hour: 19, minutes: 45 },
      { dow: 3, hour: 19, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-yara-fischer",
    full_name: "Yara Fischer",
    title: "UX Engineer",
    company: "On Running",
    bio: "I sit between design and code, which means I have opinions about both. Bring me a portfolio, a half-built project or a job ad you feel unqualified for.",
    expertise: ["React", "Figma", "Accessibility", "Design Systems", "Prototyping"],
    role_track: "Design Engineering",
    seniority: "Senior",
    languages: ["German", "English"],
    city: "Zurich",
    country: "CH",
    lat: 47.3769,
    lng: 8.5417,
    meeting_pref: "in_person",
    availability_summary: "Wednesday after work, coffee in Zurich",
    topics: ["Portfolio review", "Design-to-code", "Freelance to employed"],
    community: "Ladies that UX Zurich",
    years_experience: 8,
    slots: [
      { dow: 3, hour: 17, minutes: 60 },
      { dow: 3, hour: 18, minutes: 60 },
    ],
  },
  {
    external_id: "demo:mentor-tessa-lindqvist",
    full_name: "Tessa Lindqvist",
    title: "Security Engineer",
    company: "Proton",
    bio: "Former sysadmin, now application security. I mentor women entering security who worry they are 'not hacker enough' — the job is mostly patience and good questions.",
    expertise: ["Security", "Linux", "Python", "Threat Modeling", "Cryptography"],
    role_track: "Security",
    seniority: "Senior",
    languages: ["Swedish", "English", "German"],
    city: "Geneva",
    country: "CH",
    lat: 46.2044,
    lng: 6.1432,
    meeting_pref: "remote",
    availability_summary: "Monday evenings, monthly deep dives",
    topics: ["Into security", "Certifications worth it", "CTFs without fear"],
    community: "OWASP Geneva",
    years_experience: 10,
    slots: [
      { dow: 1, hour: 19, minutes: 60 },
      { dow: 1, hour: 20, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-ines-moreau",
    full_name: "Inès Moreau",
    title: "Data Engineer",
    company: "Nestlé",
    bio: "Pipelines, warehouses and the unglamorous glue that makes analytics real. I came from finance reporting, so I am fluent in 'my current job is not technical enough'.",
    expertise: ["SQL", "Python", "dbt", "Airflow", "Data Modeling"],
    role_track: "Data Engineering",
    seniority: "Senior",
    languages: ["French", "English"],
    city: "Lausanne",
    country: "CH",
    lat: 46.5197,
    lng: 6.6323,
    meeting_pref: "either",
    availability_summary: "Thursday lunchtimes, 30 min check-ins",
    topics: ["Analytics to engineering", "Learning plans", "Interview take-homes"],
    community: "Women in Data Romandie",
    years_experience: 9,
    slots: [
      { dow: 4, hour: 12, minutes: 30 },
      { dow: 4, hour: 13, minutes: 30 },
    ],
  },
  {
    external_id: "demo:mentor-ruth-abebe",
    full_name: "Ruth Abebe",
    title: "QA Lead",
    company: "SIX Group",
    bio: "Testing taught me systems thinking better than any course. I help people turn 'detail-oriented' into a technical career, and I am blunt about what teams actually reward.",
    expertise: ["Test Automation", "Playwright", "TypeScript", "Quality Strategy"],
    role_track: "Quality Engineering",
    seniority: "Lead",
    languages: ["English", "German"],
    city: "Zurich",
    country: "CH",
    lat: 47.3769,
    lng: 8.5417,
    meeting_pref: "either",
    availability_summary: "Tuesday mornings before standup",
    topics: ["QA to SDET", "Automation portfolio", "Returning after a break"],
    community: "Women in Tech Switzerland",
    years_experience: 13,
    slots: [
      { dow: 2, hour: 8, minutes: 30 },
      { dow: 5, hour: 8, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-clara-vogel",
    full_name: "Clara Vogel",
    title: "AI Engineer",
    company: "DeepJudge",
    bio: "Small startup, large models. I went from research assistant to shipping LLM features and I will happily tell you which parts of the hype are worth your evenings.",
    expertise: ["Python", "Machine Learning", "LLMs", "APIs", "Prompt Engineering"],
    role_track: "AI / ML Engineering",
    seniority: "Mid-senior",
    languages: ["German", "English"],
    city: "Zurich",
    country: "CH",
    lat: 47.3769,
    lng: 8.5417,
    meeting_pref: "remote",
    availability_summary: "Sunday evenings, fortnightly",
    topics: ["AI projects that impress", "Startup vs corporate", "Research to industry"],
    community: "Zurich ML Meetup",
    years_experience: 5,
    slots: [
      { dow: 0, hour: 18, minutes: 45 },
      { dow: 0, hour: 19, minutes: 45 },
    ],
  },
  {
    external_id: "demo:mentor-elif-kaya",
    full_name: "Elif Kaya",
    title: "Technical Program Manager",
    company: "Microsoft",
    bio: "I organise engineering chaos for a living and I coach on visibility: how to make your work legible to the people who decide about your career. Also a Teams power user, for better or worse.",
    expertise: ["Program Management", "Stakeholder Management", "Agile", "Communication"],
    role_track: "Program Management",
    seniority: "Senior",
    languages: ["Turkish", "English", "German"],
    city: "Munich",
    country: "DE",
    lat: 48.1351,
    lng: 11.582,
    meeting_pref: "remote",
    availability_summary: "Friday mornings, 30 min",
    topics: ["Visibility at work", "Performance reviews", "Non-coding tech careers"],
    community: "Microsoft Women's Network",
    years_experience: 11,
    slots: [
      { dow: 5, hour: 9, minutes: 30 },
      { dow: 5, hour: 10, minutes: 30 },
    ],
  },
];
