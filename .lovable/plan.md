# Fix "Request saved, email not sent"

## What's actually wrong

The email key saved in the project is a Lovable connector key, not a direct Resend key. The app currently calls Resend's own API with it, and Resend rejects it — that's the "delivery rejected (401)" you see. I confirmed this: a test call with the saved key returns "API key is invalid".

Nothing is wrong with the mentor request logic — the request really is saved, and the honest messaging is doing its job.

## The fix

Send email through the Lovable connector gateway instead of calling Resend directly, in the three places that send mail:

- the mentor request email (accept/decline links)
- the "your mentor accepted" email to the mentee
- the session confirmation emails

Each send switches from `https://api.resend.com/emails` to the gateway endpoint, authenticated with the project's Lovable key plus the connector key. Everything else — the email content, the accept/decline links, the saved status (`sent` / `failed` / `not_configured`), the on-screen wording — stays exactly as it is.

I'll add a single shared send helper so all three paths use one code path, and keep the rule that we only say "sent" when the send is actually accepted.

## After the fix, one delivery limit stays

We're still sending from Resend's sandbox address, which only delivers to the Resend account owner's own address. Mentor emails are already redirected to tejes478@gmail.com, so those will arrive. Emails addressed to a mentee at any other address will still be refused by Resend, and the app will say so honestly rather than pretending. Setting up your own sending domain later removes that limit.

## Technical detail

- New `src/lib/email-send.server.ts`: `sendEmail({ to, subject, html, text })` posting to `https://connector-gateway.lovable.dev/resend/emails` with `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${RESEND_API_KEY}`; returns `{ ok, status, body }` and logs status plus body on failure.
- `src/lib/mentor-request.functions.ts`, `src/lib/mentor-email.functions.ts`, and `src/routes/api/public/mentors/respond.ts` call it instead of `fetch("https://api.resend.com/emails")`.
- Guard on both `LOVABLE_API_KEY` and `RESEND_API_KEY` for the existing `not_configured` branch.
- Verify by requesting a mentor and checking the persisted `request_email_status` is `sent`.
