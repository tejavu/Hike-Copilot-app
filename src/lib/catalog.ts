// Warm, opinionated resource catalog: for every skill we can suggest a course,
// a practice track, a certification, and a portfolio project.

export type SkillPlan = {
  course: { title: string; provider: string; url: string };
  practice: { title: string; difficulty: string; target: number; detail: string };
  certify: { title: string; provider: string; url: string };
  project: { title: string; detail: string };
};

const CATALOG: Record<string, SkillPlan> = {
  react: {
    course: {
      title: "React Foundations to Advanced Patterns",
      provider: "Scrimba",
      url: "https://scrimba.com/learn/learnreact",
    },
    practice: {
      title: "Component & hooks katas",
      difficulty: "Medium",
      target: 20,
      detail: "Small UI challenges: forms, lists, custom hooks, state machines.",
    },
    certify: {
      title: "Meta Front-End Developer Certificate",
      provider: "Coursera / Meta",
      url: "https://www.coursera.org/professional-certificates/meta-front-end-developer",
    },
    project: {
      title: "Build a polished dashboard with React",
      detail: "Data fetching, filtering, an empty state and a loading state. Ship it publicly.",
    },
  },
  typescript: {
    course: {
      title: "Total TypeScript: Essentials",
      provider: "Total TypeScript",
      url: "https://www.totaltypescript.com/",
    },
    practice: {
      title: "Type-challenges (easy → medium)",
      difficulty: "Medium",
      target: 15,
      detail: "Generics, unions, narrowing. Two per sitting is plenty.",
    },
    certify: {
      title: "JavaScript Algorithms & Data Structures",
      provider: "freeCodeCamp",
      url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
    },
    project: {
      title: "Convert a JS project to strict TypeScript",
      detail: "Publish the repo with a short README on what you learned migrating.",
    },
  },
  python: {
    course: {
      title: "Python for Everybody",
      provider: "Coursera / U. Michigan",
      url: "https://www.coursera.org/specializations/python",
    },
    practice: {
      title: "LeetCode & Exercism Python set",
      difficulty: "Easy → Medium",
      target: 25,
      detail: "Strings, dicts, iteration patterns, then a few medium problems.",
    },
    certify: {
      title: "PCEP — Certified Entry-Level Python Programmer",
      provider: "Python Institute",
      url: "https://pythoninstitute.org/pcep",
    },
    project: {
      title: "Automate something tedious in your week",
      detail: "A CLI or script with tests, on GitHub with usage examples.",
    },
  },
  sql: {
    course: {
      title: "SQL for Data Analysis",
      provider: "Mode Analytics",
      url: "https://mode.com/sql-tutorial/",
    },
    practice: {
      title: "Query drills on real datasets",
      difficulty: "Easy → Medium",
      target: 20,
      detail: "Joins, window functions, aggregates. StrataScratch or DataLemur.",
    },
    certify: {
      title: "Databases and SQL for Data Science",
      provider: "Coursera / IBM",
      url: "https://www.coursera.org/learn/sql-data-science",
    },
    project: {
      title: "Analyse an open dataset end to end",
      detail: "Publish the queries plus three findings a stakeholder would care about.",
    },
  },
  aws: {
    course: {
      title: "AWS Cloud Practitioner Essentials",
      provider: "AWS Skill Builder",
      url: "https://explore.skillbuilder.aws/",
    },
    practice: {
      title: "Hands-on console labs",
      difficulty: "Medium",
      target: 12,
      detail: "S3, IAM, Lambda, RDS — one small lab at a time.",
    },
    certify: {
      title: "AWS Certified Cloud Practitioner",
      provider: "AWS",
      url: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    },
    project: {
      title: "Deploy a small app on AWS",
      detail: "Infrastructure as code if you can. Document the architecture.",
    },
  },
  docker: {
    course: {
      title: "Docker Mastery",
      provider: "KodeKloud",
      url: "https://kodekloud.com/courses/docker-training-course-for-the-absolute-beginner/",
    },
    practice: {
      title: "Containerise 10 small apps",
      difficulty: "Medium",
      target: 10,
      detail: "Multi-stage builds, compose files, slim images.",
    },
    certify: {
      title: "Docker Certified Associate path",
      provider: "KodeKloud",
      url: "https://kodekloud.com/",
    },
    project: {
      title: "Ship a dockerised full-stack app",
      detail: "One command to run locally. That README is your portfolio piece.",
    },
  },
  kubernetes: {
    course: {
      title: "Kubernetes for Absolute Beginners",
      provider: "KodeKloud",
      url: "https://kodekloud.com/courses/kubernetes-for-the-absolute-beginners-hands-on/",
    },
    practice: {
      title: "KillerCoda scenarios",
      difficulty: "Hard",
      target: 12,
      detail: "Deployments, services, configmaps, troubleshooting.",
    },
    certify: {
      title: "Certified Kubernetes Administrator (CKA)",
      provider: "CNCF",
      url: "https://www.cncf.io/training/certification/cka/",
    },
    project: {
      title: "Run your app on a small cluster",
      detail: "Manifests in a public repo with a diagram of the setup.",
    },
  },
  "machine learning": {
    course: {
      title: "Machine Learning Specialization",
      provider: "Coursera / DeepLearning.AI",
      url: "https://www.coursera.org/specializations/machine-learning-introduction",
    },
    practice: {
      title: "Kaggle notebooks & mini-comps",
      difficulty: "Medium → Hard",
      target: 8,
      detail: "Baseline first, then one improvement you can explain out loud.",
    },
    certify: {
      title: "TensorFlow Developer Certificate",
      provider: "Google",
      url: "https://www.tensorflow.org/certificate",
    },
    project: {
      title: "Train and deploy one model",
      detail: "A tiny demo app beats a notebook nobody can run.",
    },
  },
  "data visualisation": {
    course: {
      title: "Data Visualization with Python",
      provider: "Coursera / IBM",
      url: "https://www.coursera.org/learn/python-for-data-visualization",
    },
    practice: {
      title: "Chart-a-day challenge",
      difficulty: "Easy",
      target: 15,
      detail: "One chart, one insight, one sentence of interpretation.",
    },
    certify: {
      title: "Tableau Desktop Specialist",
      provider: "Tableau",
      url: "https://www.tableau.com/learn/certification/desktop-specialist",
    },
    project: {
      title: "Build an interactive dashboard",
      detail: "Publish it live so a hiring manager can click around.",
    },
  },
  "system design": {
    course: {
      title: "System Design Primer",
      provider: "Open source",
      url: "https://github.com/donnemartin/system-design-primer",
    },
    practice: {
      title: "Design one system per week, out loud",
      difficulty: "Hard",
      target: 10,
      detail: "Whiteboard it, record yourself, note what you'd tighten.",
    },
    certify: {
      title: "Software Architecture Foundations",
      provider: "LinkedIn Learning",
      url: "https://www.linkedin.com/learning/",
    },
    project: {
      title: "Write a design doc for something you built",
      detail: "Trade-offs, failure modes, what you'd change at 100x scale.",
    },
  },
  "product thinking": {
    course: {
      title: "Digital Product Management",
      provider: "Coursera / U. Virginia",
      url: "https://www.coursera.org/learn/uva-darden-digital-product-management",
    },
    practice: {
      title: "Teardown a product a week",
      difficulty: "Easy",
      target: 10,
      detail: "One problem, one hypothesis, one metric you'd move.",
    },
    certify: {
      title: "Professional Scrum Product Owner I",
      provider: "Scrum.org",
      url: "https://www.scrum.org/professional-scrum-product-owner-i-certification",
    },
    project: {
      title: "Write a real PRD and ship a prototype",
      detail: "Even a clickable mock counts — show the thinking.",
    },
  },
};

const ALIASES: Record<string, string> = {
  reactjs: "react",
  "react.js": "react",
  ts: "typescript",
  js: "typescript",
  javascript: "typescript",
  postgres: "sql",
  postgresql: "sql",
  "data analysis": "sql",
  ml: "machine learning",
  ai: "machine learning",
  "deep learning": "machine learning",
  cloud: "aws",
  azure: "aws",
  gcp: "aws",
  devops: "docker",
  "ci/cd": "docker",
  k8s: "kubernetes",
  tableau: "data visualisation",
  "power bi": "data visualisation",
  "data viz": "data visualisation",
  architecture: "system design",
  product: "product thinking",
  "product management": "product thinking",
};

export function normaliseSkill(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function planForSkill(skill: string): SkillPlan {
  const key = normaliseSkill(skill);
  const resolved = CATALOG[key] ?? CATALOG[ALIASES[key] ?? ""];
  if (resolved) return resolved;

  const pretty = titleCase(skill);
  return {
    course: {
      title: `${pretty}: a structured beginner-to-confident course`,
      provider: "Coursera",
      url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`,
    },
    practice: {
      title: `${pretty} practice set`,
      difficulty: "Easy → Medium",
      target: 15,
      detail: `Short, repeatable ${pretty} exercises. Little and often beats one heroic weekend.`,
    },
    certify: {
      title: `${pretty} certificate`,
      provider: "Coursera",
      url: `https://www.coursera.org/search?query=${encodeURIComponent(skill + " certificate")}`,
    },
    project: {
      title: `Build something small and real with ${pretty}`,
      detail: `A focused project that shows ${pretty} in use, with a README that tells the story.`,
    },
  };
}

export function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export const VISIBILITY_ITEMS = [
  {
    title: "Write one post about what you just built",
    detail: "200 words on LinkedIn or a blog. Link it here when it's live.",
  },
  {
    title: "Give a 5-minute talk or lightning demo",
    detail: "A team demo, a meetup, a community call. Link the slides or recording.",
  },
  {
    title: "Refresh your profile so it matches who you are now",
    detail: "New headline, new projects, new skills. Link your updated profile.",
  },
];
