import {
  isItemComplete,
  itemHours,
  ITEM_TYPE_ORDER,
  type RoadmapItem,
  type RoadmapPhase,
  type RoadmapSkill,
} from "@/lib/domain";

/**
 * One saved line of a week's plan. Stored as JSON on weekly_plans.entries, so
 * the week she sees is the week that was decided — not one recomputed from
 * live data on every render.
 */
export type PlanEntry = {
  item_id: string;
  /** Hours this week only (a partial Practice slice costs less than the whole). */
  planned_hours: number;
  /** Practice only: how many reps were assigned to this week. */
  reps?: number | null;
  /** Practice only: progress_count when the slice was assigned. */
  from_progress?: number | null;
  added_at: string;
};

export type WeeklyPlan = {
  id: string;
  week_start: string;
  budget_hours: number;
  entries: PlanEntry[];
  next_item_id: string | null;
};

export type RoadmapData = {
  phases: RoadmapPhase[];
  skills: RoadmapSkill[];
  items: RoadmapItem[];
};

/** Monday of the week the given date falls in, as YYYY-MM-DD. */
export function weekStartOf(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * Every skill's earliest incomplete step (no Build before its Learn is done),
 * ranked by phase, then skill order, then step type. Single source of truth
 * for "what comes next" — the week's fill and the reserved next item both
 * read this one list.
 */
export function rankedCandidates({ phases, skills, items }: RoadmapData): RoadmapItem[] {
  const phaseOrder = new Map(phases.map((p, i) => [p.id, p.order_index ?? i]));
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const bySkill = new Map<string, RoadmapItem[]>();
  for (const item of items) {
    const list = bySkill.get(item.skill_id) ?? [];
    list.push(item);
    bySkill.set(item.skill_id, list);
  }

  const candidates: RoadmapItem[] = [];
  for (const [skillId, list] of bySkill) {
    const sorted = [...list].sort(
      (a, b) =>
        (ITEM_TYPE_ORDER[a.item_type] ?? 9) - (ITEM_TYPE_ORDER[b.item_type] ?? 9) ||
        a.order_index - b.order_index,
    );
    const next = sorted.find((item) => !isItemComplete(item));
    if (next && skillById.has(skillId)) candidates.push(next);
  }

  candidates.sort((a, b) => {
    const sa = skillById.get(a.skill_id)!;
    const sb = skillById.get(b.skill_id)!;
    return (
      (phaseOrder.get(sa.phase_id) ?? 99) - (phaseOrder.get(sb.phase_id) ?? 99) ||
      sa.order_index - sb.order_index ||
      (ITEM_TYPE_ORDER[a.item_type] ?? 9) - (ITEM_TYPE_ORDER[b.item_type] ?? 9)
    );
  });

  return candidates;
}

/** How many units of a Practice item are still outstanding (1 for other types). */
export function remainingUnits(item: RoadmapItem): number {
  if (item.item_type !== "practice") return 1;
  const target = item.target_count ?? 1;
  return Math.max(0, target - (item.progress_count ?? 0));
}

/** Hours per single solve, so a big Practice item can be split across weeks. */
export function hoursPerUnit(item: RoadmapItem): number {
  const target = Math.max(1, item.target_count ?? 1);
  return itemHours(item) / target;
}

function entryFor(item: RoadmapItem, hours: number, reps?: number): PlanEntry {
  return {
    item_id: item.id,
    planned_hours: Math.round(hours * 100) / 100,
    reps: item.item_type === "practice" ? (reps ?? remainingUnits(item)) : null,
    from_progress: item.item_type === "practice" ? (item.progress_count ?? 0) : null,
    added_at: new Date().toISOString(),
  };
}

/**
 * Fills a week up to its hours budget. Carried-over entries (unfinished work
 * from last week) keep their place at the front and are never displaced.
 */
export function buildPlan(opts: {
  data: RoadmapData;
  budget: number;
  carryOver?: PlanEntry[];
}): { entries: PlanEntry[]; next_item_id: string | null } {
  const { data, budget: rawBudget, carryOver = [] } = opts;
  const budget = Math.max(1, rawBudget);
  const byId = new Map(data.items.map((i) => [i.id, i]));

  const entries: PlanEntry[] = [];
  let used = 0;

  for (const entry of carryOver) {
    const item = byId.get(entry.item_id);
    if (!item || isItemComplete(item)) continue;
    // Re-base a partially-done practice slice on where she actually got to.
    const refreshed: PlanEntry =
      item.item_type === "practice"
        ? { ...entry, from_progress: item.progress_count ?? 0, reps: Math.min(entry.reps ?? 1, remainingUnits(item)) }
        : entry;
    entries.push(refreshed);
    used += refreshed.planned_hours;
  }

  const taken = new Set(entries.map((e) => e.item_id));
  const ranked = rankedCandidates(data);

  for (const item of ranked) {
    if (taken.has(item.id)) continue;
    const left = budget - used;
    if (left <= 0.01) break;

    const units = remainingUnits(item);
    if (units <= 0) continue;
    const perUnit = hoursPerUnit(item);
    const fullHours = item.item_type === "practice" ? perUnit * units : itemHours(item);

    if (fullHours <= left + 0.01) {
      entries.push(entryFor(item, fullHours, units));
      taken.add(item.id);
      used += fullHours;
      continue;
    }

    if (item.item_type === "practice" && perUnit > 0) {
      const take = Math.floor((left + 0.01) / perUnit);
      if (take >= 1) {
        entries.push(entryFor(item, take * perUnit, take));
        taken.add(item.id);
        used += take * perUnit;
        continue;
      }
    }

    // One step bigger than the whole week still has to start somewhere.
    if (entries.length === 0) {
      entries.push(entryFor(item, fullHours, units));
      taken.add(item.id);
      used += Math.min(fullHours, budget);
    }
  }

  const next = ranked.find((i) => !taken.has(i.id)) ?? null;
  return { entries, next_item_id: next?.id ?? null };
}

/** The reserved next item, recomputed from the same ranked list. */
export function reserveNext(data: RoadmapData, entries: PlanEntry[]): string | null {
  const taken = new Set(entries.map((e) => e.item_id));
  return rankedCandidates(data).find((i) => !taken.has(i.id))?.id ?? null;
}

/** Promotes the reserved item into the week and reserves a new one. */
export function promoteNext(
  data: RoadmapData,
  plan: Pick<WeeklyPlan, "entries" | "next_item_id">,
): { entries: PlanEntry[]; next_item_id: string | null } {
  const item = data.items.find((i) => i.id === plan.next_item_id);
  if (!item) return { entries: plan.entries, next_item_id: reserveNext(data, plan.entries) };
  const units = Math.max(1, remainingUnits(item));
  const hours = item.item_type === "practice" ? hoursPerUnit(item) * units : itemHours(item);
  const entries = [...plan.entries, entryFor(item, hours, units)];
  return { entries, next_item_id: reserveNext(data, entries) };
}

/** Hours actually finished for one planned line. */
export function entryHoursDone(item: RoadmapItem, entry: PlanEntry): number {
  if (item.item_type === "practice") {
    const reps = entry.reps ?? 1;
    const from = entry.from_progress ?? 0;
    const doneReps = Math.max(0, Math.min(reps, (item.progress_count ?? 0) - from));
    return reps > 0 ? (entry.planned_hours / reps) * doneReps : 0;
  }
  return isItemComplete(item) ? entry.planned_hours : 0;
}

/** True when this week's slice of the item is finished. */
export function entryComplete(item: RoadmapItem, entry: PlanEntry): boolean {
  if (item.item_type === "practice") {
    const reps = entry.reps ?? 1;
    const from = entry.from_progress ?? 0;
    return (item.progress_count ?? 0) >= from + reps;
  }
  return isItemComplete(item);
}
