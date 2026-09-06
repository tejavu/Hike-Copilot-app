# Hike Copilot

**A personalized AI career coach for women in tech.**

Hike Copilot helps users identify realistic technical roles, understand their skill gaps, build a personalized career roadmap, meet the right people, and progress toward a new role one concrete step at a time.

The application combines structured onboarding, CV understanding, live job discovery, personalized learning, networking opportunities, mentor matching, and an AI career coach in one workspace.

## Features

### Personalized onboarding

Users can start from an existing CV or build their profile manually. The onboarding flow captures:

* CV and supporting documents
* career interests
* preferred locations and work setup
* work authorization
* professional experience
* technical skills and confidence levels
* education, certifications, and projects
* target timeline
* weekly time commitment

Uploaded documents are parsed with AI to pre-fill the profile, while the user can review and edit the extracted information before it is used.

### Technical job discovery

Hike Copilot searches for roles that fit the user's actual background, constraints, skills, and target level.

The current sourcing pipeline is Switzerland-first and uses:

* **Adzuna** for live job listings
* **Firecrawl** to search selected Swiss job boards such as jobs.ch and JobUp
* AI-assisted extraction of required skills from job descriptions

The recommendation pipeline deliberately focuses on **technical / STEM roles** rather than generic roles that happen to share a keyword.

If suitable live listings cannot be found, Hike Copilot can provide clearly labelled example role archetypes rather than presenting fabricated jobs as real openings.

Users can select roles that interest them, and those choices feed directly into roadmap generation.

### Personalized career roadmap

Once the target roles and skill gaps are known, Hike Copilot generates a roadmap around the user's available time and desired timeline.

Depending on the time horizon, the roadmap can include phases such as:

* **Learning** — focused courses and skill acquisition
* **Building** — portfolio projects that create visible proof of ability
* **Becoming visible** — professional visibility and networking
* **Applying** — tracking target roles and application progress

Roadmap tasks can include:

* learning resources
* practice exercises
* certifications
* portfolio projects
* visibility and networking tasks

The app also creates a persistent **This Week** plan based on the user's weekly time budget.

Learning resources are drawn from a curated catalog including Microsoft Learn, LinkedIn Learning, GitHub, Coursera, Exercism, LeetCode, AWS resources, and other technical learning platforms. Microsoft and LinkedIn Learning resources are preferred where suitable.

### AI career coach

The chat is connected to the user's saved career context and can do more than simply answer questions.

The coach can:

* explain skill gaps and roadmap choices
* add, update, or remove roadmap tasks
* remove skills the user no longer wants to pursue
* improve the CV profile summary
* rewrite experience and project descriptions without inventing facts
* search for new job recommendations
* discuss career strategy using the user's actual profile and roadmap

Separate chat threads are supported for additional conversations.

### Networking

The **Network** area surfaces events relevant to the user's goals instead of presenting a generic event directory.

The live event sourcing pipeline currently checks sources including:

* Women in Tech Switzerland
* Women in Digital Switzerland
* WomenTech Network
* SwissDevJobs
* SwissHacks
* LauzHack

Users can:

* filter events
* save events
* RSVP / mark interest
* add events to their calendar
* export `.ics` calendar files
* open events in Google Calendar or Outlook
* record reflections after attending

### Mentor Match

The **Mentor Match** flow uses the user's goals, roadmap gaps, preferences, language, location, and availability to select a best-fit mentor.

Rather than making the user browse through a large directory, Hike Copilot recommends one strong match and explains why.

The workflow supports:

* mentoring needs assessment
* explainable mentor matching
* mentor request emails
* accept / decline flow
* scheduling
* calendar export
* session preparation
* session notes and workspace
* feedback
* follow-up actions
* roadmap integration
* in-app check-in reminders

The current project includes demo mentor records and can generate additional demo mentor profiles when the existing directory does not cover a user's field.

## Authentication

Hike Copilot supports:

* email + password registration and sign-in through Supabase Auth
* email verification
* **Continue with Google** through Lovable Cloud Auth

User-specific application data is stored in Supabase.

## Tech stack

| Layer                 | Technology                         |
| --------------------- | ---------------------------------- |
| Application framework | TanStack Start                     |
| Frontend              | React 19 + TypeScript              |
| Routing               | TanStack Router                    |
| Data fetching         | TanStack Query                     |
| Styling               | Tailwind CSS 4                     |
| UI                    | Radix UI / shadcn-style components |
| Database              | Supabase / PostgreSQL              |
| Authentication        | Supabase Auth + Lovable Cloud Auth |
| AI                    | Lovable AI Gateway                 |
| Web extraction        | Firecrawl                          |
| Job sourcing          | Adzuna + Swiss job boards          |
| Email                 | Resend                             |
| Build tooling         | Vite                               |

## Project structure

```text
.
├── public/
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── chat/
│   │   ├── cv/
│   │   ├── jobs/
│   │   ├── mentor/
│   │   ├── network/
│   │   ├── onboarding/
│   │   ├── roadmap/
│   │   └── ui/
│   │
│   ├── hooks/
│   │
│   ├── integrations/
│   │   ├── lovable/
│   │   └── supabase/
│   │
│   ├── lib/
│   ├── routes/
│   ├── router.tsx
│   └── styles.css
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│
├── roadmap.md
├── package.json
└── vite.config.ts
```

## Main routes

| Route                           | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `/`                             | Authentication, onboarding, and main AI coach |
| `/chat/:threadId`               | Individual chat thread                        |
| `/roadmap`                      | Personalized roadmap and application tracking |
| `/network`                      | Networking events and reflections             |
| `/mentor-match`                 | Mentor matching and mentoring workspace       |
| `/api/public/mentors/respond`   | Mentor accept / decline handler               |
| `/api/public/mentors/reminders` | Mentor reminder endpoint                      |
| `/api/public/events/refresh`    | Event refresh endpoint                        |

## Getting started

### Prerequisites

You will need:

* Node.js or Bun
* a compatible Supabase project
* credentials for the external integrations you want to enable

### Install dependencies

Using npm:

```bash
npm install
```

or Bun:

```bash
bun install
```

### Environment variables

Create a local `.env` file.

Never commit real secrets to the repository.

```bash
# Supabase

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=

# Lovable AI / connector gateway

LOVABLE_API_KEY=

# Live web search

FIRECRAWL_API_KEY=

# Job search

ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Mentor email

RESEND_API_KEY=
MENTOR_EMAIL_FROM=
MENTOR_EMAIL_REDIRECT=

# Public application URL

PUBLIC_APP_URL=

# or

VITE_PUBLIC_APP_URL=

# Optional cron authentication

LOVABLE_CRON_SECRET=
LOVABLE_CRON_SECRET_PREVIOUS=
```

When running inside Lovable, some credentials may be supplied through Lovable Cloud or connected integrations instead of being manually defined in `.env`.

## Database

Hike Copilot uses Supabase for application data, authentication, and file storage.

The main entities include:

```text
profiles
user_documents

jobs

chat_threads
chat_messages

roadmap_phases
roadmap_skills
roadmap_items
weekly_plans

events
event_engagement
event_reflections

mentors
mentor_preferences
mentor_matches
mentor_sessions
mentor_actions
session_feedback
```

Generated Supabase types are available at:

```text
src/integrations/supabase/types.ts
```

Database migrations live under:

```text
supabase/migrations/
```

If recreating the application against a completely new Supabase project, verify that the complete base schema exists before relying solely on the incremental migrations included in this repository.

## Run locally

Start the development server:

```bash
npm run dev
```

or:

```bash
bun run dev
```

Open the local URL printed by Vite.

## Scripts

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build.

```bash
npm run build:dev
```

Build using development mode.

```bash
npm run preview
```

Preview the production build locally.

```bash
npm run lint
```

Run ESLint.

```bash
npm run format
```

Format the repository with Prettier.


## Routing

The application uses **TanStack Start file-based routing**.

Routes live in:

```text
src/routes/
```

`src/routeTree.gen.ts` is generated automatically and should not be edited manually.

Built with Lovable

Hike Copilot was developed with Lovable.

Although Lovable is used to build and operate the project, Hike Copilot is a normal React / TypeScript codebase that can be developed locally and maintained in Git.


