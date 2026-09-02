# Fix: Network and Mentor Match show no suggestions

## What's actually wrong

It is not the matching logic — it's that there is no data to match against.

Confirmed by querying the backend:

- `mentors` table: **0 rows**
- `events` table: **0 rows**
- (`roadmap_skills` has 12 rows, `profiles` 1 row — so your side of the matching input is fine)

Why they're empty:

- The mentor directory content exists in code (`src/lib/mentor-seed.ts`, ~20 profiles) but **nothing ever imports it** — it was never written into the database.
- The event catalog exists in code (`src/lib/event-seed.ts`) and is only loaded by a public refresh endpoint (`/api/public/events/refresh`) that nothing in the app ever calls.

So both pages load, score an empty list, and correctly render "no matches".

## The fix

1. **Seed the mentor directory into the database** with a migration containing literal INSERT rows built from the existing seed content (same fields the matcher reads: expertise, languages, seniority, availability, timezone, demo flag).
2. **Seed the event catalog the same way**, with dates written relative to now so the board opens with upcoming events.
3. **Keep the event board fresh**: have the Network page trigger the existing refresh ingestion when the catalog is empty or all events are in the past, instead of relying on someone hitting the public endpoint manually. Dates roll forward as they already do in `refreshEvents`.
4. **Verify end to end**: re-query both tables, then open Network and Mentor Match in the browser to confirm ranked events appear and the assessment returns one best-fit mentor.

## Notes

- No changes to scoring or matching rules — they stay exactly as designed.
- Mentor profiles remain clearly labelled as demo volunteer profiles, as before.
- Events keep their real source attribution (Meetup, Eventbrite, LinkedIn Events, women-in-tech calendars).
