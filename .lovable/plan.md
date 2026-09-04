# Mentor accept/decline link: what's actually wrong

## Findings

**1. The route is live.** The public accept/decline page is published and working on this project's own address (`coach-and-grow-39.lovable.app`). Not a publishing problem.

**2. The request row exists.** The request sent at 18:04 today is in the database, still waiting for an answer (`pending_mentor`), and its email was recorded as sent. Its link code is valid.

**3. The link in the email points at the wrong website.** The email builds its buttons from a fallback address left over from the project this one was remixed from — `tech-ascend-buddy.lovable.app`. That is a different, still-live app with a different database, so it genuinely has no record of this request and correctly answers "We couldn't find that request." Sending the exact same link to this project's own address returns the success page.

So it is not expiry, not single-use, not a UUID/format or wrong-table mismatch — the buttons simply lead to someone else's app.

Note: while confirming this, the test request (18:04, accepted) was marked accepted, since loading the accept link is the action itself. I'd re-send a fresh request when testing the fix.

## Fix

- Set the site address used in mentor emails from this project's real published address instead of the inherited hard-coded fallback, so accept/decline buttons always point back here.
- Make the fallback this project's own address, and prefer an explicit configured value when present, so a future remix or custom domain doesn't silently re-break it.
- Re-send one mentor request afterwards and click through the emailed accept link end to end to confirm it lands on the confirmation page and flips the request's status here.

## Technical detail

`appUrl()` in `src/lib/mentor-request.functions.ts` reads `PUBLIC_APP_URL` / `VITE_PUBLIC_APP_URL`, neither of which is set, and falls back to `https://tech-ascend-buddy.lovable.app`. Both accept and decline URLs, and the "open Mentor Match" link in the mentor-ready email, derive from it. Change: set `PUBLIC_APP_URL` as a project secret to `https://coach-and-grow-39.lovable.app` and update the literal fallback to match. `src/routes/api/public/mentors/respond.ts` needs no change — its `request_token` lookup is correct.
