import { useEffect, useMemo } from "react";
import { CalendarClock, Clock, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ItemControls } from "@/components/roadmap/ItemControls";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import {
  entryComplete,
  entryHoursDone,
  isItemCompleteSafe,
  type PlanEntry,
} from "@/lib/week-plan-helpers";
import { itemHours, type RoadmapItem, type RoadmapPhase, type RoadmapSkill } from "@/lib/domain";

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
  const data = useMemo(() => ({ phases, skills, items }), [phases, skills, items]);
  const ready = items.length > 0;
  const { plan, loading, addNext, adding, refreshNext } = useWeeklyPlan(data, budget, ready);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const lines = useMemo(() => {
    if (!plan) return [] as { entry: PlanEntry; item: RoadmapItem }[];
    return plan.entries
      .map((entry) => ({ entry, item: itemById.get(entry.item_id) }))
      .filter((l): l is { entry: PlanEntry; item: RoadmapItem } => Boolean(l.item));
  }, [plan, itemById]);

  const upNext = plan?.next_item_id ? (itemById.get(plan.next_item_id) ?? null) : null;

  // If the reserved item gets finished elsewhere on the roadmap, reserve the
  // next one — the label and what actually arrives must never disagree.
  useEffect(() => {
    if (!plan) return;
    const reserved = plan.next_item_id ? itemById.get(plan.next_item_id) : null;
    if (plan.next_item_id && (!reserved || isItemCompleteSafe(reserved))) refreshNext();
    if (!plan.next_item_id) refreshNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.next_item_id, items]);

  const planned = lines.reduce((sum, l) => sum + l.entry.planned_hours, 0);
  const doneHours = lines.reduce((sum, l) => sum + entryHoursDone(l.item, l.entry), 0);
  const fill = planned > 0 ? Math.min(100, Math.round((doneHours / planned) * 100)) : 0;
  const ahead = doneHours > planned + 0.01;
  const allDone = lines.length > 0 && lines.every((l) => entryComplete(l.item, l.entry));

  const renderLine = ({ entry, item }: { entry: PlanEntry; item: RoadmapItem }) => {
    const done = entryComplete(item, entry);
    const partial =
      item.item_type === "practice" && (entry.reps ?? 0) < (item.target_count ?? 1)
        ? { take: entry.reps ?? 0, remaining: (item.target_count ?? 1) - (entry.from_progress ?? 0) - (entry.reps ?? 0) }
        : null;
    const oversized = entry.planned_hours > budget + 0.01;
    return (
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
            {partial && partial.take > 0 && (
              <Badge variant="secondary" className="h-5 text-[0.65rem]">
                {partial.take} this week
              </Badge>
            )}
          </div>
          <p className={`mt-0.5 font-medium ${done ? "line-through decoration-muted-foreground/50" : ""}`}>
            {item.title}
          </p>
          {partial && partial.remaining > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Just {partial.take} of them this week — the other {partial.remaining} carry into the weeks after.
            </p>
          )}
          {oversized && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              This one is bigger than a single week on its own — take it at your own pace.
            </p>
          )}
          <div className="mt-2.5">
            <ItemControls item={item} />
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
          <Clock className="size-3" /> {formatHours(entry.planned_hours)}
        </span>
      </li>
    );
  };

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
        <div className="text-right">
          <p className="text-xs font-semibold text-muted-foreground tabular-nums">
            {formatHours(doneHours)} done of {formatHours(planned)} planned
          </p>
          {ahead && <p className="text-xs font-semibold text-primary">Ahead of plan — nice.</p>}
        </div>
      </div>
      <Progress value={fill} className="mt-3 h-2" />

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Getting your week ready…</p>
      ) : lines.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing left outstanding — everything on your roadmap is done. That's worth a pause.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">{lines.map(renderLine)}</ul>
      )}

      {upNext && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/20 p-3.5">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Next up — saved for after this week
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

          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={adding}
            onClick={() => addNext()}
          >
            <Plus className="size-3.5" /> Add this to my week
          </Button>
          {allDone && (
            <p className="mt-2 text-xs text-muted-foreground">
              You've finished everything you planned for this week — add it only if you want to keep going.
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        This week's list stays exactly as it is until next week — anything you don't get to carries over.
      </p>
    </section>
  );
}
