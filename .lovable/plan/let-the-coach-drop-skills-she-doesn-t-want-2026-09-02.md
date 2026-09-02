# Let the coach drop skills she doesn't want

Today the coach can only add or edit roadmap steps. If she says "I don't want to learn Kubernetes", nothing can actually be removed — the model either talks around it or risks claiming a change it can't make.

## What changes

- The coach gains the ability to remove a single step, or an entire skill and all its steps, from the roadmap.
- It always confirms first ("Want me to take Kubernetes off your roadmap entirely?") before removing anything, and only says it's done once the removal actually succeeded.
- Removing a skill reports how many steps went with it, so she knows the scope of what she agreed to.
- If she says she isn't interested but doesn't confirm removal, the coach leaves the roadmap untouched and offers the option instead.
- Completed steps with uploaded proof are kept unless she explicitly confirms deleting those too — the coach flags them before removing.

## Technical notes

In `src/lib/coach-ai.functions.ts`:

- Add two tools alongside the existing ones:
  - `remove_roadmap_item` — `{ match_title }`, resolved like `update_roadmap_item` (user-scoped `ilike`, ambiguity rejected), then delete that row.
  - `remove_roadmap_skill` — `{ skill }`, normalized (trim/lowercase/collapse whitespace) lookup across all of the user's `roadmap_skills`, delete its `roadmap_items` then the skill row; return the deleted count. If the skill row ends up with no siblings in its phase, leave the phase alone.
- Both handlers return `{ ok, ... }` / `{ ok: false, error }` in the same shape as the current tools, and set `roadmapChanged: true` on success so ChatView refreshes.
- Extend `SYSTEM` with a removal rule: she may decline any skill; confirm before removing, never claim removal without a successful tool call, and warn when the target has completed steps with proof.
- Handlers check for `done`/`proof_url`/`proof_path` items and return a "needs explicit confirmation" error unless a `confirm_completed: true` argument is passed.

No schema changes required.
