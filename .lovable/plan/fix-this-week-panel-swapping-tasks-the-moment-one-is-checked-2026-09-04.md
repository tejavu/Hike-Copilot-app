# Fix This Week panel swapping tasks the moment one is checked off

## The problem

The This Week panel recomputes its list on every render from "what's still open." The moment she ticks a checkbox, the completed item vanishes and a brand-new item slides into its place. The roadmap data itself is correct (only the clicked item is marked done), but the panel's instant swap makes it feel like the whole week was marked finished and the next week already started.

## The fix

Make This Week a stable weekly list instead of an instantly re-shuffling one:

1. **Keep completed items visible for the current week.** Items ticked off in This Week stay in the list with their checked/done state (and a subtle "Done" look), rather than disappearing mid-session.

2. **Show replacements as "Up next", not as part of this week.** When finishing an item frees up hours, the next eligible item appears below the weekly list under an "Up next — if you have time" heading, clearly separated so it doesn't read as next week's plan starting early.

3. **Still recompute on a fresh visit.** The moment-based swap only softens within the current view; when she leaves and returns, the panel recalculates as it does today (completed items drop out, new ones fill the budget), so the panel never goes stale.

4. **Planned-hours line stays honest.** The "6h of 6h planned" summary counts only not-yet-complete items in the current week list, so ticking one off shows the remaining load.

## Technical notes

- All changes are in `src/components/roadmap/ThisWeekPanel.tsx`.
- `pickThisWeek` keeps its existing selection logic; the component additionally tracks (in local state) items completed during the current view so they remain rendered with `ItemControls` showing their done state.
- "Up next" uses the same `pickThisWeek` output minus the current-week items (the next candidate that didn't fit the budget, or the one freed-up budget would now admit), rendered read-only with its type label and hours — no completion controls, to avoid implying it's part of this week.
- No changes to `RoadmapView`, `ItemControls`, the data model, or any mutation — the same underlying records are used.
- The phase-list roadmap below is untouched.

## Verification

- Typecheck and build.
- Manually: tick a Learn checkbox in This Week — the item stays, marked done; an "Up next" suggestion appears below; the main roadmap shows only that item completed.
