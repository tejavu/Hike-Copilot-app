import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ItemControls } from "@/components/roadmap/ItemControls";
import {
  isItemComplete,
  itemHours,
  ITEM_TYPE_ORDER,
  type RoadmapItem,
  type RoadmapPhase,
  type RoadmapSkill,
} from "@/lib/domain";

const TYPE_LABEL: Record<string, string> = {
  learn: "Learn",
  practice: "Practice",
  build: "Build",
  certify: "Certify",
  visibility: "Be seen",
};

function formatHours(hours: number) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

/**
 * Every skill's earliest incomplete step (no Build before its Learn is done),
 * ranked by phase, then skill order, then step type. This is the shared
 * candidate pool both the weekly pick and the "Up next" suggestion draw from.
 */
function rankedCandidates(opts: {
  phases: RoadmapPhase[];
  skills: RoadmapSkill[];
  items: RoadmapItem[];
}): RoadmapItem[] {
  const { phases, skills, items } = opts;
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

/**
 * Picks the next handful of unfinished steps that fit into the hours she has
 * this week. Recomputed on every render from live data, so it stays honest
 * whether she's ahead or behind.
 */
export function pickThisWeek(opts: {
  phases: RoadmapPhase[];
  skills: RoadmapSkill[];
  items: RoadmapItem[];
  weeklyHours: number;
}): RoadmapItem[] {
  const { weeklyHours } = opts;
  const candidates = rankedCandidates(opts);

  const budget = Math.max(1, weeklyHours);
  const chosen: RoadmapItem[] = [];
  let used = 0;
  for (const item of candidates) {
    const hours = itemHours(item);
    if (chosen.length === 0 || used + hours <= budget) {
      chosen.push(item);
      used += hours;
    }
    if (used >= budget) break;
  }
  return chosen;
}

export function ThisWeekPanel({
  phases,
  skills,
  items,
  weeklyHours,
}: {
  phases: RoadmapPhase[];
  skills: RoadmapSkill[];
  items: RoadmapItem[];
  weeklyHours: number | null;
}) {
  const budget = weeklyHours && weeklyHours > 0 ? weeklyHours : 5;
  const picked = useMemo(
    () => pickThisWeek({ phases, skills, items, weeklyHours: budget }),
    [phases, skills, items, budget],
  );
  const candidates = useMemo(() => rankedCandidates({ phases, skills, items }), [phases, skills, items]);
  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  // Items she ticks off stay visible (checked) until she leaves and returns,
  // instead of vanishing mid-click and being silently swapped for a new task.
  const [keptDone, setKeptDone] = useState<RoadmapItem[]>([]);
  const prevPickedRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentIds = new Set(picked.map((i) => i.id));
    const prev = prevPickedRef.current;
    if (prev) {
      const newlyDone = items.filter((i) => prev.has(i.id) && isItemComplete(i) && !currentIds.has(i.id));
      if (newlyDone.length > 0) {
        setKeptDone((kept) => {
          const map = new Map(kept.map((i) => [i.id, i]));
          for (const item of newlyDone) map.set(item.id, item);
          return [...map.values()];
        });
      }
    }
    prevPickedRef.current = currentIds;
  }, [picked, items]);

  // The next thing after this week's list: read-only, clearly optional.
  const pickedIds = useMemo(() => new Set(picked.map((i) => i.id)), [picked]);
  const upNext = useMemo(
    () => candidates.find((i) => !pickedIds.has(i.id)) ?? null,
    [candidates, pickedIds],
  );

  const planned = picked.reduce((sum, item) => sum + itemHours(item), 0);
  const fill = Math.min(100, Math.round((planned / budget) * 100));

  const renderItem = (item: RoadmapItem, done: boolean) => (
    <li
      key={item.id}
      className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border p-3.5 ${
        done ? "bg-secondary/20 opacity-75" : "bg-secondary/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {TYPE_LABEL[item.item_type] ?? item.item_type}
          </span>
          <Badge variant="outline" className="h-5 bg-card text-[0.65rem]">
            {skillById.get(item.skill_id)?.name ?? "Your roadmap"}
          </Badge>
          {done && (
            <Badge variant="secondary" className="h-5 text-[0.65rem]">
              Done
            </Badge>
          )}
        </div>
        <p className={`mt-0.5 font-medium ${done ? "line-through decoration-muted-foreground/50" : ""}`}>
          {item.title}
        </p>
        {/* Same per-type control as the main roadmap; completing here
            updates the same row. Done items keep their control visible
            (checked state) until the next visit. */}
        <div className="mt-2.5">
          <ItemControls item={item} />
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
        <Clock className="size-3" /> {formatHours(itemHours(item))}
      </span>
    </li>
  );

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-warm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="size-4 text-primary" /> This week
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {weeklyHours && weeklyHours > 0
              ? `Built around the ${budget}h a week you said you have.`
              : "Based on about 5h a week — tell me your real number and I'll adjust."}
          </p>
        </div>
        <p className="text-xs font-semibold text-muted-foreground tabular-nums">
          {formatHours(planned)} of {formatHours(budget)} planned
        </p>
      </div>
      <Progress value={fill} className="mt-3 h-2" />

      {picked.length === 0 && keptDone.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing left outstanding — everything on your roadmap is done. That's worth a pause.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {picked.map((item) => renderItem(item, false))}
          {keptDone.map((item) => renderItem(item, true))}
        </ul>
      )}

      {upNext && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-3.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Up next — if you have time
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  {TYPE_LABEL[upNext.item_type] ?? upNext.item_type}
                </span>
                <Badge variant="outline" className="h-5 bg-card text-[0.65rem]">
                  {skillById.get(upNext.skill_id)?.name ?? "Your roadmap"}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">{upNext.title}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
              <Clock className="size-3" /> {formatHours(itemHours(upNext))}
            </span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Finished something? It stays ticked here for now, and this list refreshes next time you open the roadmap.
      </p>
    </section>
  );
}
