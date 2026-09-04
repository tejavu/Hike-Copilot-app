import type { EducationEntry, ExperienceEntry, LanguageEntry, ProjectEntry } from "./domain";
import { sortByPeriodDesc } from "./cv-order";

type CvProfile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  goal: string | null;
  /** Optional, user-written. Renders as a bare line under the header, or not at all. */
  summary?: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects?: ProjectEntry[];
  certifications: string[];
  languages?: LanguageEntry[];
};

type Earned = {
  certifications: { title: string; provider: string | null; url: string | null }[];
  projects: { title: string; skill: string; url: string | null }[];
  courses: { title: string; provider: string | null }[];
  readySkills?: string[];
};

export type CvData = { profile: CvProfile; earned: Earned };

function esc(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

/** "Zurich, Switzerland" -> the city/country tail shown on the right column. */
function cityOf(location: string | null | undefined): string {
  if (!location) return "";
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return parts.slice(-2).join(", ");
}

const NEGATIVE = /^(no|none|n\/a|nope|not yet|nothing)\.?$/i;

function bullets(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  return `<ul>${clean.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function entry(leftTop: string, rightTop: string, sub: string, bulletItems: string[]): string {
  return `<div class="block">
    <div class="row"><span class="bold">${esc(leftTop)}</span><span>${esc(rightTop)}</span></div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
    ${bullets(bulletItems)}
  </div>`;
}

function skillRow(label: string, value: string): string {
  if (!value) return "";
  return `<div class="row2"><span class="bold">${esc(label)}</span><span>${esc(value)}</span></div>`;
}

/**
 * Everything the two exporters share, so the HTML preview and the .tex
 * download can never drift apart.
 */
function collect({ profile, earned }: CvData) {
  const city = cityOf(profile.location);

  const certificates = [
    ...earned.certifications.map((cert) => ({
      title: cert.title,
      issuer: cert.provider ?? "",
      url: cert.url ?? "",
    })),
    ...(profile.certifications ?? [])
      .filter((name) => name && !NEGATIVE.test(name.trim()))
      .map((name) => ({ title: name, issuer: "", url: "" })),
  ];

  // Both project sources, side by side: what she wrote/uploaded, plus what
  // she actually shipped through the roadmap.
  const projects = [
    ...(profile.projects ?? [])
      .filter((project) => project.title && !NEGATIVE.test(project.title.trim()))
      .map((project) => ({
        title: project.title,
        period: project.period ?? "",
        summary: project.detail ?? "",
        bullets: project.url ? [`Link: ${project.url}`] : [],
      })),
    ...earned.projects.map((project) => ({
      title: project.title,
      period: project.url ? "Published" : "",
      summary: project.skill
        ? `${project.skill} project built and shipped through a structured learning roadmap.`
        : "Project built and shipped through a structured learning roadmap.",
      bullets: [project.url ? `Live link: ${project.url}` : ""].filter(Boolean),
    })),
  ];

  const own = (profile.skills ?? []).filter(Boolean);
  const ready = (earned.readySkills ?? []).filter(Boolean);
  const newlyLearnt = ready.filter((skill) => !own.some((s) => s.toLowerCase() === skill.toLowerCase()));
  const courses = earned.courses.map((course) =>
    [course.title, course.provider].filter(Boolean).join(" — "),
  );

  const languages = (profile.languages ?? []).filter((lang) => lang.name?.trim());

  return { city, certificates, projects, own, newlyLearnt, courses, languages };
}

/**
 * Conservative Swiss CV: single column, black and white, ruled section rules,
 * in the order Swiss recruiters expect — Profile, Professional Experience,
 * Education, Projects, Technical Skills, Certificates, Languages, References.
 */
export function buildCvHtml(data: CvData): string {
  const { profile, earned } = data;
  const { city, certificates, projects, own, newlyLearnt, courses, languages } = collect(data);
  const experience = sortByPeriodDesc(profile.experience ?? [], "experience entry");
  const education = sortByPeriodDesc(profile.education ?? [], "education entry");

  const experienceHtml =
    experience.length > 0
      ? experience
          .map((role) =>
            entry(
              role.title || role.company || "Role",
              role.period || "",
              [role.company, city].filter(Boolean).join(", "),
              [role.detail || ""],
            ),
          )
          .join("")
      : `<p class="muted">Add your roles in onboarding or chat and they will appear here.</p>`;

  const educationHtml =
    education.length > 0
      ? education
          .map((edu, index) =>
            entry(
              edu.title || edu.institution || "Education",
              edu.period || "",
              [edu.institution, city].filter(Boolean).join(", "),
              index === 0 && courses.length > 0 ? [`Relevant coursework: ${courses.join("; ")}`] : [],
            ),
          )
          .join("")
      : `<p class="muted">Add your education and it will appear here.</p>`;

  const projectsHtml = projects
    .map((project) => entry(project.title, project.period, project.summary, project.bullets))
    .join("");

  const certificatesHtml = certificates.length
    ? `<ul>${certificates
        .map(
          (cert) =>
            `<li><span class="bold">${esc(cert.title)}</span>${cert.issuer ? ` — ${esc(cert.issuer)}` : ""}${
              cert.url ? ` (${esc(cert.url)})` : ""
            }</li>`,
        )
        .join("")}</ul>`
    : "";

  const languagesHtml = languages
    .map((lang) => skillRow(lang.name, lang.level || "—"))
    .join("");

  // Optional and user-written only: no heading, no derived filler, nothing at
  // all when she hasn't written one.
  const summary = profile.summary?.trim() ?? "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(profile.full_name) || "Curriculum Vitae"} — CV</title>
<style>
  @page { size: A4; margin: 16mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Times, Georgia, serif; color: #000; background: #fff; font-size: 10.5pt; line-height: 1.34; margin: 0; }
  header { margin-bottom: 10px; }
  h1 { font-size: 20pt; font-weight: bold; margin: 0 0 4px; }
  header p { margin: 0; font-size: 10pt; }
  h2 { font-size: 11pt; font-weight: bold; margin: 14px 0 5px; padding-bottom: 2px; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.04em; }
  .block { margin-bottom: 8px; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .row span:last-child { white-space: nowrap; }
  .row2 { display: flex; gap: 12px; margin-bottom: 2px; }
  .row2 span:first-child { width: 34%; flex: none; }
  .sub { font-style: italic; }
  .bold { font-weight: bold; }
  ul { margin: 2px 0 0; padding-left: 16px; }
  li { margin: 0 0 1px; }
  .muted { margin: 2px 0 0; font-style: italic; }
  .summary-text { margin: 6px 0 0; }
</style></head>
<body>
  <header>
    <h1>${esc(profile.full_name) || "Your Name"}</h1>
    <p>${esc(profile.location) || "City, Country"}</p>
    <p>${esc(profile.phone) || "Phone"} | ${esc(profile.email) || "email@example.com"}</p>
  </header>

  ${summary ? `<p class="summary-text">${esc(summary)}</p>` : ""}

  <h2>Professional Experience</h2>
  ${experienceHtml}

  <h2>Education</h2>
  ${educationHtml}

  ${projectsHtml ? `<h2>Projects</h2>${projectsHtml}` : ""}

  <h2>Technical Skills</h2>
  ${
    skillRow("Skills", own.join(", ")) + skillRow("Recently developed", newlyLearnt.join(", ")) ||
    `<p class="muted">Complete roadmap steps and your skills will fill in here.</p>`
  }

  ${certificatesHtml ? `<h2>Certificates</h2>${certificatesHtml}` : ""}

  ${languagesHtml ? `<h2>Languages</h2>${languagesHtml}` : ""}

  <h2>References</h2>
  <p>Available upon request.</p>
</body></html>`;
}

function tex(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function texItems(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  return `\\begin{itemize}\n${clean.map((item) => `    \\item{} ${tex(item)}`).join("\n")}\n\\end{itemize}\n`;
}

/**
 * The same content as the HTML CV, poured into the Swiss LaTeX template as
 * plain text — no compilation, she takes it to her own toolchain.
 */
export function buildCvTex(data: CvData): string {
  const { profile } = data;
  const { city, certificates, projects, own, newlyLearnt, courses, languages } = collect(data);
  const experience = sortByPeriodDesc(profile.experience ?? [], "experience entry");
  const education = sortByPeriodDesc(profile.education ?? [], "education entry");

  const summary = profile.summary?.trim() ?? "";

  const experienceTex =
    experience
      .map(
        (role) =>
          `\\textbf{${tex(role.title || role.company || "Role")}} \\hfill ${tex(role.period || "")} \\\\{}\n${tex(
            [role.company, city].filter(Boolean).join(", "),
          )}\n${texItems([role.detail || ""])}\n\\vspace{4pt}\n`,
      )
      .join("\n") || "% Add your roles in the app and they will appear here.\n";

  const educationTex =
    education
      .map(
        (edu, index) =>
          `\\textbf{${tex(edu.title || edu.institution || "Education")}} \\hfill ${tex(edu.period || "")} \\\\{}\n${tex(
            [edu.institution, city].filter(Boolean).join(", "),
          )}${
            index === 0 && courses.length
              ? ` \\\\\n\\textbf{Relevant coursework:} ${tex(courses.join("; "))}`
              : ""
          }\n\\vspace{4pt}\n`,
      )
      .join("\n") || "% Add your education in the app and it will appear here.\n";

  const projectsTex = projects.length
    ? `\\cvsection{Projects}\n\n${projects
        .map(
          (project) =>
            `\\textbf{${tex(project.title)}} \\hfill ${tex(project.period)} \\\\{}\n${tex(project.summary)}\n${texItems(
              project.bullets,
            )}\n\\vspace{4pt}\n`,
        )
        .join("\n")}`
    : "";

  const skillRows = [
    own.length ? `\\textbf{Skills} & ${tex(own.join(", "))} \\\\` : "",
    newlyLearnt.length ? `\\textbf{Recently developed} & ${tex(newlyLearnt.join(", "))} \\\\` : "",
  ].filter(Boolean);

  const skillsTex = skillRows.length
    ? `\\cvsection{Technical Skills}\n\\begin{tabularx}{\\textwidth}{@{}l X@{}}\n${skillRows.join("\n")}\n\\end{tabularx}\n`
    : "";

  const certificatesTex = certificates.length
    ? `\\cvsection{Certificates}\n\\vspace{-8pt}\n\\begin{itemize}\n${certificates
        .map((cert) => {
          const label = `\\textbf{${tex(cert.title)}}`;
          const linked = cert.url ? `\\href{${cert.url}}{${label}}` : label;
          return `    \\item ${linked}${cert.issuer ? ` -- ${tex(cert.issuer)}` : ""}`;
        })
        .join("\n")}\n\\end{itemize}\n`
    : "";

  const languagesTex = languages.length
    ? `\\cvsection{Languages}\n\\begin{tabularx}{\\textwidth}{@{}l X@{}}\n${languages
        .map((lang) => `\\textbf{${tex(lang.name)}} & ${tex(lang.level || "")} \\\\`)
        .join("\n")}\n\\end{tabularx}\n`
    : "";

  return `% Swiss CV — generated by Hike Copilot. Compile with pdflatex or xelatex.
\\documentclass[11pt,a4paper]{article}

\\usepackage[left=1.8cm,top=1.4cm,right=1.8cm,bottom=1.4cm]{geometry}
\\usepackage[parfill]{parskip}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{tabularx}
\\usepackage{enumitem}
\\usepackage{graphicx}
\\usepackage{hyperref}

\\hypersetup{colorlinks=true, linkcolor=black, urlcolor=black, filecolor=black, citecolor=black}
\\setlist[itemize]{leftmargin=1.1em, topsep=1pt, itemsep=1pt, parsep=0pt}
\\pagestyle{empty}

\\newcommand{\\cvsection}[1]{%
    \\par\\vspace{8pt}%
    \\textbf{\\large \\MakeUppercase{#1}}\\\\[-4pt]
    \\rule{\\textwidth}{0.6pt}\\\\[3pt]
}

\\begin{document}

\\noindent
\\begin{minipage}[t]{0.72\\textwidth}
    {\\Huge\\bfseries ${tex(profile.full_name || "Your Name")}}\\\\[4pt]
    ${tex(profile.location || "City, Country")} \\\\{}
    ${tex(profile.phone || "")} \\textbar{} \\href{mailto:${profile.email ?? ""}}{${tex(profile.email || "")}}
\\end{minipage}%
\\hfill
\\begin{minipage}[t]{0.22\\textwidth}
    \\raggedleft
    \\IfFileExists{photo.jpg}{\\includegraphics[width=3.2cm]{photo.jpg}}{}
\\end{minipage}

\\vspace{4pt}

${summary ? `${tex(summary)}\n\\vspace{4pt}\n` : ""}
\\cvsection{Professional Experience}

${experienceTex}
\\cvsection{Education}

${educationTex}
${projectsTex}
${skillsTex}
${certificatesTex}
${languagesTex}
\\cvsection{References}
Available upon request.

\\end{document}
`;
}
