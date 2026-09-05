# Real LinkedIn Learning courses on the roadmap

Today LinkedIn Learning appears only as a generic search link ("Also on LinkedIn Learning: linkedin.com/learning/search?keywords=Azure"). This replaces that with real, titled courses found live on linkedin.com/learning.

## What's possible (verified)

- LinkedIn Learning's official API is enterprise-only and the LinkedIn connector only exposes profile/posting — so no official catalog lookup.
- The already-linked Firecrawl connection can search the web, so we can find real course pages (`linkedin.com/learning/<course-slug>`) with their real titles and URLs. No new keys or connectors needed.

## What changes

1. **New server function** `src/lib/linkedin-learning.functions.ts`: given a list of skill names, it searches Firecrawl with `site:linkedin.com/learning <skill>`, keeps only real course URLs (filters out search/topic pages), and returns up to 2 courses per skill — each with title and URL. Results are cached briefly so repeat roadmaps don't re-hit the API. If nothing solid is found, it returns the existing generic search link as the fallback.

2. **Roadmap build** (`generateRoadmap` in `roadmap-builder.ts`, called from onboarding and chat): before building the Learn steps, it calls the new function once for all roadmap skills and weaves the real courses into each Learn step's detail text — e.g. "On LinkedIn Learning: *Azure Fundamentals* (real link) · *Azure Essential Training* (real link)".

3. **Display** — no visual change needed beyond what exists: the Microsoft-tinted card treatment and "via LinkedIn Learning" label already apply. Course links behave like the other resource links.

## Guarantees

- Only real URLs returned by the search are used — nothing is invented; if the search is down or empty, the step silently keeps today's generic search link.
- Curated catalog entries (React, Python, AWS, Azure's Microsoft Learn course…) stay exactly as they are; this only enriches the LinkedIn Learning line.
- One batched lookup per roadmap build, so it adds seconds, not minutes.

## Technical notes

- Server-side only: `LOVABLE_API_KEY` + `FIRECRAWL_API_KEY` via the connector gateway, same pattern as the Swiss job-board search in `job-search.server.ts`.
- New file: `src/lib/linkedin-learning.server.ts` (+ thin `.functions.ts` wrapper). Edits: `src/lib/roadmap-builder.ts` (call + detail weaving).
