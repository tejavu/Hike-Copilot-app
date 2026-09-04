# Fix mentor-request 401: route email straight to Resend

## What I found (verified, nothing changed yet)

**1. Is the mentor-request path using the shared helper?** Yes. `requestMentorMatch` in `src/lib/mentor-request.functions.ts` imports `sendEmail` / `emailConfigured` from `src/lib/email-send.server.ts`. There are no remaining direct `api.resend.com` calls anywhere in the app; all three email paths (mentor request, mentor-accepted notice, session confirmation) go through the shared helper, which posts to the Lovable connector gateway.

**2. Is gateway routing still correct?** No. The key the running app holds today is a genuine Resend key (`re_...`, 36 chars), not the Lovable connector key (`lov...`, 37 chars) the gateway fix was built for. The gateway rejects it with `401 Credential not found`; that is the exact 401 you see, and the one recorded in the app's server log.

Why my earlier "test send arrived" was misleading: the test ran from my sandbox shell, which still holds a stale copy of the old `lov...` connector key. That copy works through the gateway, so the test passed, but the app itself already had the new `re_` key and never could. Sending with the app's real key straight to Resend (`Authorization: Bearer RESEND_API_KEY`) is accepted, and Resend reports it is a valid send-only key, which is exactly what we need.

**3. Verdict:** the code path is right; the routing is wrong for the key you now have. Switch the shared helper from the connector gateway to a direct Resend call.

## The fix

- Change `sendEmail` in `src/lib/email-send.server.ts` to POST to `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}` and drop the `X-Connection-Api-Key` / `LOVABLE_API_KEY` requirement from `emailConfigured()` (only `RESEND_API_KEY` and `MENTOR_EMAIL_FROM` needed).
- Nothing else changes: same helper signature, same `sent` / `failed` / `not_configured` persistence, same "Request sent" vs "Request saved, email not sent" wording, same redirect of mentor mail to tejes478@gmail.com, same sandbox sender `onboarding@resend.dev`.
- Callers (`mentor-request.functions.ts`, `mentor-email.functions.ts`, `routes/api/public/mentors/respond.ts`) are untouched.

## Verification

- Typecheck and build.
- Call the send helper once with the app's actual key (not my shell copy) to tejes478@gmail.com and confirm Resend returns 200 with an id.
- Request a mentor in the preview and confirm the saved `request_email_status` is `sent` and the card no longer shows the 401 notice.

## Remaining limit (unchanged)

Sandbox sender only delivers to the Resend account owner's address. Mentor emails go to tejes478@gmail.com so they will arrive; a mentee at any other address will still be refused by Resend, and the app will say so honestly. A verified sending domain removes that later.
