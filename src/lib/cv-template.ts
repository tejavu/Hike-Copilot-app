import type { EducationEntry, ExperienceEntry } from "./domain";

type CvProfile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  goal: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: string[];
};

type Earned = {
  certifications: { title: string; provider: string | null; url: string | null }[];
  projects: { title: string; skill: string; url: string | null }[];
  courses: { title: string; provider: string | null }[];
  readySkills?: string[];
};

function esc(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

/** "Zurich, Switzerland" -> city/country tail used on the right-hand column. */
function cityOf(location: string | null | undefined): string {
  if (!location) return "";
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return parts.slice(-2).join(", ");
}

function bullets(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  return `<ul>${clean.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function block(
  leftTop: string,
  rightTop: string,
  leftSub: string,
  rightSub: string,
  bulletItems: string[],
): string {
  return `<div class="block">
    <div class="row"><span class="bold">${esc(leftTop)}</span><span>${esc(rightTop)}</span></div>
    ${
      leftSub || rightSub
        ? `<div class="row"><span class="ital">${esc(leftSub)}</span><span>${esc(rightSub)}</span></div>`
        : ""
    }
    ${bullets(bulletItems)}
  </div>`;
}

function labelled(label: string, value: string): string {
  if (!value) return "";
  return `<p class="labelled"><span class="bold">${esc(label)}:</span> ${esc(value)}</p>`;
}

/**
 * Conservative one-page CV: centered header, ruled section headings, serif type,
 * black and white. Populated from onboarding profile + roadmap-earned work.
 */
export function buildCvHtml({ profile, earned }: { profile: CvProfile; earned: Earned }): string {
  const experience = [...(profile.experience ?? [])].reverse();
  const education = [...(profile.education ?? [])].reverse();
  const city = cityOf(profile.location);

  const certNames = [
    ...earned.certifications.map((cert) => [cert.title, cert.provider].filter(Boolean).join(" — ")),
    ...(profile.certifications ?? []),
  ];

  const educationHtml =
    education.length > 0
      ? education
          .map((entry, index) =>
            block(
              entry.institution || entry.title,
              city,
              entry.institution ? entry.title : "",
              entry.period || "",
              index === 0
                ? [
                    certNames.length > 0 ? `Certifications completed: ${certNames.join("; ")}` : "",
                    (earned.readySkills ?? []).length > 0
                      ? `Roadmap skills brought to a working standard: ${(earned.readySkills ?? []).join(", ")}`
                      : "",
                    earned.courses.length > 0
                      ? `Relevant coursework: ${earned.courses
                          .map((course) => [course.title, course.provider].filter(Boolean).join(" (") + (course.provider ? ")" : ""))
                          .join("; ")}`
                      : "",
                  ]
                : [],
            ),
          )
          .join("")
      : `<p class="muted">Add your education in chat and it will appear here.</p>`;

  const experienceBlocks = experience.map((entry) =>
    block(
      entry.company || entry.title,
      city,
      entry.company ? entry.title : "",
      entry.period || "",
      [entry.detail || ""],
    ),
  );

  const projectBlocks = earned.projects.map((project) =>
    block(
      "Portfolio Project",
      project.url ? "Published" : city,
      project.title,
      project.skill ? project.skill : "",
      [
        `Built and shipped as part of a structured ${project.skill || "technical"} learning roadmap.`,
        project.url ? `Live link: ${project.url}` : "",
      ],
    ),
  );

  const workHtml =
    experienceBlocks.length + projectBlocks.length > 0
      ? [...experienceBlocks, ...projectBlocks].join("")
      : `<p class="muted">Add your roles in chat, or complete a Build step in your roadmap, and they will appear here.</p>`;

  const technical = (profile.skills ?? []).concat(
    (earned.readySkills ?? []).filter((skill) => !(profile.skills ?? []).includes(skill)),
  );

  const skillsHtml = [
    labelled("Languages", ""),
    labelled("Technical Skills", technical.join(", ")),
    labelled("Certifications & Training", certNames.join("; ")),
    labelled(
      "Activities",
      earned.projects.map((project) => project.title).join("; "),
    ),
    labelled("Interests", profile.goal ? `Career focus: ${profile.goal}` : ""),
  ]
    .filter(Boolean)
    .join("");

  const personal = [
    profile.nationality ? `Nationality: ${profile.nationality}` : "",
    profile.date_of_birth ? `Date of birth: ${profile.date_of_birth}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(profile.full_name) || "Curriculum Vitae"} — CV</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, Georgia, serif; color: #000; background: #fff; font-size: 10.5pt; line-height: 1.32; margin: 0; }
  header { text-align: center; margin-bottom: 12px; }
  h1 { font-size: 19pt; font-weight: bold; margin: 0 0 3px; letter-spacing: 0.02em; }
  header p { margin: 0; font-size: 10pt; }
  h2 { font-size: 11pt; font-weight: bold; margin: 14px 0 4px; padding-bottom: 2px; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.03em; }
  .block { margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row span:last-child { white-space: nowrap; }
  .bold { font-weight: bold; }
  .ital { font-style: italic; }
  ul { margin: 2px 0 0; padding-left: 16px; }
  li { margin: 0 0 1px; }
  .labelled { margin: 0 0 2px; }
  .muted { margin: 2px 0 0; font-style: italic; }
</style></head>
<body>
  <header>
    <h1>${esc(profile.full_name) || "Your Name"}</h1>
    <p>${esc(profile.location) || "Street address, City, Country"}</p>
    <p>${esc(profile.phone) || "Phone"} | ${esc(profile.email) || "email@example.com"}</p>
    ${personal ? `<p>${esc(personal)}</p>` : ""}
  </header>

  <h2>Education</h2>
  ${educationHtml}

  <h2>Work &amp; Leadership Experience</h2>
  ${workHtml}

  <h2>Skills, Activities &amp; Interests</h2>
  ${skillsHtml || `<p class="muted">Complete roadmap steps and your skills will fill in here.</p>`}
</body></html>`;
}
