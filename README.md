# Hike Copilot

Build a warm, encouraging career-coach web app for women in tech to identify skill gaps, close them, land jobs, and build confidence/visibility to stay in them. Tone: like a supportive career coach, never clinical or corporate HR.

OVERALL STRUCTURE
Sidebar-based app with these nav items:
- AI Chat — default landing view, always available
- Roadmap — the single home for ALL skill-building (no separate "Upskill" section, everything lives here)
- Network — visible in sidebar, "coming soon" empty state with a friendly message about what it'll offer eventually
- Mentor Match — visible in sidebar, "coming soon" empty state with a friendly message about what it'll offer eventually
- A small CV button pinned at the bottom of the sidebar, always accessible, visually separate from the main nav items

Roadmap, Network, and Mentor Match stay locked/greyed out in the sidebar (not clickable, visually indicate locked) until the user completes onboarding AND a roadmap has been generated. AI Chat and CV are always available regardless of onboarding state.

ONBOARDING (happens inside AI Chat as a conversational flow)
1. Bot greets the user warmly and offers two paths: (a) answer a friendly one-question-at-a-time questionnaire covering interests, current skills, education, qualifications, certifications, or (b) upload documents (resume, transcripts, certificates) instead. Either path builds a structured user profile.
2. Bot does a job sweep to find relevant openings (use realistic mock/generated job data — title, company, location, description, required skills) and presents a shortlist as swipeable/likeable cards (like/pass).
3. Based on liked jobs, bot compares her profile against the required skills for those roles and shows a "skill gap summary": skills she already has vs. skills she still needs, framed positively.
4. Bot asks for her timeline ("how long do you have?") and her goal ("what are you working toward?").
5. Bot generates her Roadmap from this. Once generated, Roadmap/Network/Mentor Match unlock in the sidebar.

ROADMAP SECTION (the core of the app)
One continuous, scrollable page — not a maze of sub-pages or tabs. Built from her skill gaps + timeline + goal, organized into sequential phases: Learning, Building, Applying by default, but the number/naming of phases can flex based on timeline length (e.g. fewer for a short timeline, more for a longer one). Should feel like one connected journey, not disconnected tabs.

- Learning phase: for each missing skill, show three resource types the user works through directly in-app:
  - Learn: a suggested course (title/provider/link, "I finished this" checkbox to complete)
  - Practice: coding/skill practice items tagged by difficulty, tracked as a running count against a target (e.g. "12 of 20 solved") with a way to increment progress
  - Certify: a relevant certification suggestion; only counts as done once she uploads a certificate or adds a credential link as proof
- Building phase: for each skill, a suggested project/repo idea to build a portfolio piece; only counts as done once she adds a real link to what she built
- Applying phase: tracks real job applications tied to the specific jobs the roadmap was built around, with a status selector per job: not applied / applied / interviewing / offer

Each skill shows a progress bar that fills as its resources are completed, and visibly flips to a "ready"/complete state once everything under it is done. Make completion feel earned with visible milestones, not just checkboxes — use progress bars, phase completion indicators, and small celebratory moments.

NETWORK & MENTOR MATCH PAGES
Each gets its own clean page (not a blank/error state) with a friendly "coming soon" message and a short line teasing what they'll eventually offer (e.g. Network: connecting with other women in tech; Mentor Match: pairing with mentors in her target field).

CV BUTTON
Clicking generates a CV from everything gathered: profile info from onboarding plus anything built or certified in the Roadmap. Format to Swiss CV standards specifically (distinct from a flashy US-style resume): reverse-chronological experience, education section, a photo placeholder, a personal details block (nationality, date of birth, etc.), clean and conservative layout. Let her preview it in-app and download it (PDF).

DESIGN
Warm, encouraging, confident — never clinical. Lean heavily on visible progress (bars, completed phases, milestones). This needs a backend (Lovable Cloud) for: storing the user profile, chat state, roadmap/skill progress, uploaded documents/certificates, and job/application data — set that up as needed.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://coach-and-grow-39.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ec409c8-03ed-44fb-a811-a2b4bae2d446).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
