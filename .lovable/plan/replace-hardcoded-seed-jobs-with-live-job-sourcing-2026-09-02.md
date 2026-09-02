# Replace hardcoded seed jobs with live job sourcing

Today the job list comes from nine handwritten role templates in `src/lib/job-sweep.ts`, scored locally. That is why a hardware/FPGA profile still lands on Data Analyst and UX Engineer: no relevant role exists in the pool. This replaces the seed list with real postings, keeping breadth across every tech field.

## Sources

1. **Adzuna API** — broad EU and Swiss coverage, keyword + location + full-time search. Primary source.
2. **Firecrawl on jobs.ch and jobup.ch** — Swiss on-site and German/French-language listings Adzuna misses. Secondary source, used to top up Swiss results.
3. **AI-generated role archetypes (Lovable AI)** — only when the live sources return nothing relevant, and always visibly labelled as illustrative examples so the roadmap can still be built.

## How matching works after the change

1. Build a search query from her actual profile: confident skills first (weighted by confidence level), then interests and drawn-to text, plus her chosen locations and work setups.
2. Query Adzuna per location; query Firecrawl for the Swiss locations in parallel.
3. Deduplicate by title + company, then score each real posting against her skills — exact and alias matches on normalised skills, token matching with a stop list (so "FSM Design" no longer matches a "design" tag), confidence-weighted.
4. Keep postings above a real relevance threshold; show location and setup as hard filters, relaxing city only when nothing remains and saying so on screen.
5. If nothing clears the threshold, generate 4-6 role archetypes from her skill set with Lovable AI, each badged "Example role — no live posting matched your filters yet".

## What she sees

- Real job cards with company, location, setup, source name and a working apply link.
- A small source line ("via Adzuna" / "via jobs.ch") so results are traceable.
- Loading state while sourcing, an honest error state if a source is down, and the labelled-archetype state when no live match exists.
- Everything downstream is unchanged: like/skip, skill-gap analysis, roadmap generation, weekly-hours question.

## Technical notes

- New server function `src/lib/job-search.functions.ts`: runs Adzuna + Firecrawl + AI fallback server-side, returns a normalised `GeneratedJob[]` (adding `url` and `source`). Keys never touch the browser.
- `src/lib/job-sweep.ts` keeps the scoring, setup/location filters and `skillGap`, but scores incoming live postings instead of the seed array. The seed array is deleted.
- `jobs` table gains `url` and `source` columns via migration; existing rows keep working.
- Callers updated: `OnboardingForm.tsx` and `ChatView.tsx` call the server function and pass `skill_confidence` through rather than a flat skill list.
- Secrets needed: Adzuna `app_id` + `app_key` (free developer signup — I will request them), and the Firecrawl connector linked to this project.
- Cache each search result briefly per user so repeated sweeps do not re-hit the APIs.

## Before I build

I need the Adzuna app ID and key, and the Firecrawl connector connected. I will prompt for both at the start of the build; the AI-archetype fallback works without either, so the app stays functional while they are pending.
