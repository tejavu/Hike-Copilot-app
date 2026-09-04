import { useMemo } from "react";
import { CalendarClock, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  const { phases, skills, items, weeklyHours } = opts;
  const phaseOrder = new Map(phases.map((p, i) => [p.id, p.order_index ?? i]));
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const bySkill = new Map<string, RoadmapItem[]>();
  for (const item of items) {
    const list = bySkill.get(item.skill_id) ?? [];
    list.push(item);
    bySkill.set(item.skill_id, list);
  }

  // Within a skill, only the earliest incomplete step is eligible: no Build
  // before its Learn is done.
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
  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const planned = picked.reduce((sum, item) => sum + itemHours(item), 0);
  const fill = Math.min(100, Math.round((planned / budget) * 100));

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

      {picked.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing left outstanding — everything on your roadmap is done. That's worth a pause.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {picked.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-secondary/40 p-3.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                    {TYPE_LABEL[item.item_type] ?? item.item_type}
                  </span>
                  <Badge variant="outline" className="h-5 bg-card text-[0.65rem]">
                    {skillById.get(item.skill_id)?.name ?? "Your roadmap"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-medium">{item.title}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
                <Clock className="size-3" /> {formatHours(itemHours(item))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        This list rebuilds itself every time you open the roadmap, so it always reflects what's still open.
      </p>
    </section>
  );
}
