import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildPlan,
  promoteNext,
  reserveNext,
  weekStartOf,
  type PlanEntry,
  type RoadmapData,
  type WeeklyPlan,
} from "@/lib/week-plan";

type Row = {
  id: string;
  week_start: string;
  budget_hours: number | string;
  entries: unknown;
  next_item_id: string | null;
};

function toPlan(row: Row): WeeklyPlan {
  return {
    id: row.id,
    week_start: row.week_start,
    budget_hours: Number(row.budget_hours),
    entries: Array.isArray(row.entries) ? (row.entries as PlanEntry[]) : [],
    next_item_id: row.next_item_id,
  };
}

/**
 * The week's plan is decided once and saved, so it stays put while she works
 * through it. Reopening the roadmap — on any device — shows the same week;
 * only a new calendar week (or her explicitly adding the next task) changes it.
 */
export function useWeeklyPlan(data: RoadmapData, budget: number, ready: boolean) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const weekStart = weekStartOf();

  // The picker needs live roadmap data, but the plan must not refetch every
  // time an item changes — so the data is read through a ref inside queryFn.
  const dataRef = useRef(data);
  dataRef.current = data;
  const budgetRef = useRef(budget);
  budgetRef.current = budget;

  const key = ["weekly-plan", user?.id, weekStart];

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user) && ready,
    staleTime: Infinity,
    queryFn: async (): Promise<WeeklyPlan | null> => {
      const { data: rows, error } = await supabase
        .from("weekly_plans")
        .select("id, week_start, budget_hours, entries, next_item_id")
        .eq("user_id", user!.id)
        .order("week_start", { ascending: false })
        .limit(1);
      if (error) throw error;

      const latest = rows?.[0] ? toPlan(rows[0] as Row) : null;
      if (latest && latest.week_start === weekStart) return latest;

      // New week (or first ever): unfinished work carries over first.
      const built = buildPlan({
        data: dataRef.current,
        budget: budgetRef.current,
        carryOver: latest?.entries ?? [],
      });
      const { data: created, error: insertError } = await supabase
        .from("weekly_plans")
        .insert({
          user_id: user!.id,
          week_start: weekStart,
          budget_hours: budgetRef.current,
          entries: built.entries as never,
          next_item_id: built.next_item_id,
        })
        .select("id, week_start, budget_hours, entries, next_item_id")
        .single();
      if (insertError) throw insertError;
      return toPlan(created as Row);
    },
  });

  const save = useMutation({
    mutationFn: async (patch: { entries: PlanEntry[]; next_item_id: string | null }) => {
      const plan = query.data;
      if (!plan) return;
      const { error } = await supabase
        .from("weekly_plans")
        .update({ entries: patch.entries as never, next_item_id: patch.next_item_id })
        .eq("id", plan.id);
      if (error) throw error;
      qc.setQueryData(key, { ...plan, ...patch });
    },
  });

  return {
    plan: query.data ?? null,
    loading: query.isLoading,
    addNext: () => {
      const plan = query.data;
      if (!plan) return;
      save.mutate(promoteNext(dataRef.current, plan));
    },
    adding: save.isPending,
    /** Keeps the reserved item honest when the roadmap changes underneath. */
    refreshNext: () => {
      const plan = query.data;
      if (!plan) return;
      const next = reserveNext(dataRef.current, plan.entries);
      if (next !== plan.next_item_id) save.mutate({ entries: plan.entries, next_item_id: next });
    },
  };
}
