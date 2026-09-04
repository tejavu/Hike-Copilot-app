# Optional CV summary + reliable newest-first ordering

## What changes for you

1. **A short summary line on your CV.** Fully optional and written by you. If you write one it appears as a single line under your name, with no heading. If you leave it blank, nothing shows — no placeholder, no nudge.
2. **A place to write it.** A small optional text box in the CV panel, labelled "Add a short summary if you'd like one" — never presented as a required step.
3. **Experience and education always show newest first**, worked out from the dates you actually wrote, instead of trusting the order things happen to be stored in. This applies to the CV (both the printable version and the .tex download) and to the onboarding review screen.

## Ordering rules

A small helper reads the free-text period ("September 2021 -- September 2023", "July 2017 -- May 2021", "September 2024 -- ongoing") and works out an end date to sort by:

- "ongoing" / "present" / "current" / "now" counts as the latest possible date, so it sorts to the top.
- Otherwise the second date in the range is used; if there's only one date, that one is used.
- Entries whose period can't be understood go after all the sortable ones, keeping their existing order among themselves, and a warning is logged so it's visible rather than silently wrong.

Because sorting happens at display time, nothing that creates entries — CV parsing, onboarding, chat, anything added later — has to keep the order right.

## Technical notes

- **New `src/lib/cv-order.ts`**: `parsePeriodEnd(period)` returning a sortable timestamp or `null`, and `sortByPeriodDesc(entries)` doing a stable partition (parseable sorted desc, then unparseable in original order) with `console.warn` for each unparseable non-empty period. Month-name and numeric-month formats, plus bare years.
- **`src/lib/cv-template.ts`**: adopt the attached version's `buildCvHtml` body and styles (including `.summary-text` and the `profile.summary` line), but reconciled with this codebase rather than dropped in verbatim — the attached file assumes `linkedin`/`websites` fields that don't exist on `Profile` here, and drops `buildCvTex`, which the .tex download uses. Keep the existing exported `CvData`/`collect`/`buildCvTex`, remove the derived-`goal` "Profile" section, and route both `buildCvHtml` and `buildCvTex` through `sortByPeriodDesc` instead of the current `.reverse()`.
- **Data**: add a nullable `summary text` column to `profiles` via migration (existing RLS/grants unchanged), add `summary: string | null` to `Profile` in `src/lib/domain.ts`, and to `CvProfile`.
- **`src/components/cv/CvDialog.tsx`**: add the optional summary textarea alongside the existing location/phone/languages fields, saved through the existing `useUpdateProfile` flow, and pass it into the CV data.
- **`src/components/onboarding/OnboardingForm.tsx`** review step: display experience/education through the same sort helper.
