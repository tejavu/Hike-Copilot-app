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
};

function esc(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function entry(left: string | undefined, title: string, sub?: string | null, detail?: string | null) {
  return `<div class="entry"><div class="left">${esc(left)}</div><div><p class="title">${esc(title)}</p>${
    sub ? `<p class="sub">${esc(sub)}</p>` : ""
  }${detail ? `<p class="sub">${esc(detail)}</p>` : ""}</div></div>`;
}

/** Swiss CV conventions: photo, personal details block, reverse-chronological, conservative type. */
export function buildCvHtml({ profile, earned }: { profile: CvProfile; earned: Earned }): string {
  const experience = [...(profile.experience ?? [])].reverse();
  const education = [...(profile.education ?? [])].reverse();

  const details = [
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Address", profile.location],
    ["Nationality", profile.nationality],
    ["Date of birth", profile.date_of_birth],
  ]
    .map(([label, value]) => `<div><span class="k">${esc(label)}:</span> ${esc(value) || "—"}</div>`)
    .join("");

  const certs = [
    ...earned.certifications.map((c) => entry("Certified", c.title, c.provider)),
    ...(profile.certifications ?? []).map((c) => entry("Certified", c)),
  ].join("");

  const projects = [
    ...earned.projects.map((p) => entry(p.skill || "Project", p.title, p.url)),
    ...earned.courses.map((c) => entry("Course", c.title, c.provider)),
  ].join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(profile.full_name) || "Curriculum Vitae"} — CV</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #22201e; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  header { display: flex; gap: 18px; border-bottom: 1px solid #d8d2ca; padding-bottom: 14px; }
  .photo { width: 32mm; height: 40mm; border: 1px solid #d8d2ca; display: flex; align-items: center; justify-content: center; color: #9c948a; font-family: Arial, sans-serif; font-size: 8pt; text-align: center; padding: 4px; }
  h1 { font-size: 20pt; margin: 0 0 2px; letter-spacing: -0.01em; }
  .goal { color: #6b635a; margin: 0 0 8px; }
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; font-family: Arial, sans-serif; font-size: 8.5pt; color: #554f48; }
  .k { font-weight: bold; }
  section { border-bottom: 1px solid #e6e1da; padding: 12px 0; }
  section:last-of-type { border-bottom: 0; }
  h2 { font-family: Arial, sans-serif; font-size: 8.5pt; letter-spacing: 0.14em; text-transform: uppercase; margin: 0 0 8px; }
  .entry { display: grid; grid-template-columns: 34mm 1fr; gap: 8px; margin-bottom: 8px; }
  .left { font-family: Arial, sans-serif; font-size: 8.5pt; color: #6b635a; }
  .title { font-weight: bold; margin: 0; }
  .sub { color: #6b635a; margin: 1px 0 0; }
  .skills { margin: 0; }
</style></head>
<body>
  <header>
    <div class="photo">Photo</div>
    <div>
      <h1>${esc(profile.full_name) || "Your name"}</h1>
      ${profile.goal ? `<p class="goal">${esc(profile.goal)}</p>` : ""}
      <div class="details">${details}</div>
    </div>
  </header>
  <section><h2>Professional experience</h2>${
    experience.map((e) => entry(e.period, e.title, e.company, e.detail)).join("") || "<p class='sub'>—</p>"
  }</section>
  <section><h2>Education</h2>${
    education.map((e) => entry(e.period, e.title, e.institution)).join("") || "<p class='sub'>—</p>"
  }</section>
  ${projects ? `<section><h2>Projects &amp; further education</h2>${projects}</section>` : ""}
  ${certs ? `<section><h2>Certifications</h2>${certs}</section>` : ""}
  <section><h2>Skills</h2><p class="skills">${esc((profile.skills ?? []).join(" · ")) || "—"}</p></section>
</body></html>`;
}
