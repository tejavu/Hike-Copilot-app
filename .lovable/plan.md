# Make "This Week" a real, saved week

## What's actually wrong

I reproduced all three problems by running the weekly picker against your real roadmap (15h a week). The ranking rule isn't the problem — the problem is that **the week is never saved**. It is recalculated from live data on every render, so it moves under you.

Traced sequence from the simulation:

```text
open roadmap   -> AI learn | SoftEng learn | Research learn | Algo learn | BizAnalysis learn
                  Next: Azure learn
tick AI learn  -> SoftEng | Research | Algo | BizAnalysis | AI PRACTICE (6 of 15)
                  Next: still "Azure learn"   <- the practice step jumped the queue
tick SoftEng   -> AI practice (full 7.5h) | Research | Algo | SoftEng practice
                  BizAnalysis learn is GONE, untouched and incomplete
reopen page    -> AI practice | SoftEng practice        <- again not "Azure learn"
```

1. **One ranking function, but "Next" is only a label.** Both the list and the Next line read the same ranked pool, but Next is computed afterwards as "first ranked item not currently in the list". It reserves nothing. Ticking a Learn item off makes that skill's Practice step a brand-new candidate ranked *above* the item Next named, so the backfill takes the Practice step instead.
2. **Yes, rebuilt from scratch every change.** A Practice item that had been sliced to fit the leftover hours grows back to full size on the rebuild and pushes a still-incomplete sibling off the end of the budget. That's why an untouched task silently vanishes.
3. **Nothing is remembered on reopen**, so the fresh rebuild picks whatever ranks first that day — again not the stated Next item.

## The fix

**Save the week, don't recompute it.** The week's plan is chosen once, stored in your account, and stays fixed until the week rolls over.

1. **A saved weekly plan.** On the first visit of a given week, the picker runs once and the result (the chosen steps, their planned hours, and how many practice reps are assigned this week) is saved to your account. Reopening the roadmap — on any device — shows exactly the same week.
2. **Nothing silently disappears.** Items stay in the week until you finish them or the week ends. Completed ones stay visible, ticked, with a "Done" look.
3. **"Next up" becomes a real reservation.** The single item named as next is chosen and saved by the same function, at the same time as the week's list. When it's promoted into the week, it is that exact item — the label can never disagree with what arrives.
4. **Finishing early is your call.** When everything planned is done (or there are spare hours), a button appears: "Add the next task to this week." Nothing enters the week on its own. Taking it promotes the reserved Next item and reserves a new one.
5. **Hours show progress, not load.** The line reads "6h done of 15h planned" and the bar fills as you tick things off. Going over is celebrated, not clipped — "17h of 15h" with a full bar and a small "ahead of plan" note.
6. **Week rollover.** When a new week starts, unfinished items carry over first, then the budget is topped up with the next ranked steps — so a task you didn't get to is never dropped in favour of something newer.

## Technical notes

- New table `weekly_plans`: `user_id`, `week_start` (date, Monday), `budget_hours`, `entries jsonb` (item id, planned hours, practice reps assigned, added-at), `next_item_id`, timestamps. Unique on (`user_id`, `week_start`). RLS scoped to `auth.uid()` with the standard grants.
- `pickThisWeek` / `rankedCandidates` keep their ranking logic but move to `src/lib/week-plan.ts` and gain one entry point that returns **both** the week's entries and the reserved next item, so there is exactly one "what's next" decision.
- `ThisWeekPanel.tsx` stops deriving the list. It reads the saved plan through a new `useWeeklyPlan` hook (React Query), creates it on first visit of the week, carries over unfinished entries on rollover, and mutates it on "add the next task".
- The local `pinnedRef` / `keptDone` session hacks are removed — persistence replaces them.
- Completed hours come from the saved entries cross-referenced with live `roadmap_items` state (`isItemComplete`, practice `progress_count`), so ticking a box in the main roadmap updates the weekly bar too.
- Nothing else changes: same `ItemControls`, same mutations, same underlying roadmap rows.
