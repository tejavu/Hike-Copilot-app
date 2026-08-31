import { supabase } from "@/integrations/supabase/client";
import { planForSkill, titleCase, VISIBILITY_ITEMS } from "./catalog";
import type { PhaseKind } from "./domain";

type PhaseSpec = { name: string; kind: PhaseKind; blurb: string };

export function phasePlanFor(months: number): PhaseSpec[] {
  if (months <= 3) {
    return [
      {
        name: "Learning, fast and focused",
        kind: "learning",
        blurb: "Short runway, so we go narrow and deep on the few skills that unlock these roles.",
      },
      {
        name: "Applying with intention",
        kind: "applying",
        blurb: "You apply while you learn. Momentum matters more than being 100% ready.",
      },
    ];
  }
  if (months <= 9) {
    return [
      {
        name: "Learning",
        kind: "learning",
        blurb: "One skill at a time: learn it, practise it, then make it official.",
      },
      {
        name: "Building",
        kind: "building",
        blurb: "Now you turn knowledge into proof — something a stranger can click on.",
      },
      {
        name: "Applying",
        kind: "applying",
        blurb: "The roles this whole roadmap was built around. Track every conversation here.",
      },
    ];
  }
  return [
    {
      name: "Learning",
      kind: "learning",
      blurb: "You have real time here. Build depth properly instead of cramming.",
    },
    {
      name: "Building",
      kind: "building",
      blurb: "Portfolio pieces that show your judgement, not just your syntax.",
    },
    {
      name: "Becoming visible",
      kind: "visibility",
      blurb: "Being good is half of it. This phase is about being known for it.",
    },
    {
      name: "Applying",
      kind: "applying",
      blurb: "By now you're not hoping you're ready. You have the receipts.",
    },
  ];
}

export async function generateRoadmap(opts: {
  userId: string;
  gaps: string[];
  months: number;
}): Promise<void> {
  const { userId, gaps, months } = opts;

  // Clear any previous roadmap so regenerating never doubles up.
  await supabase.from("roadmap_phases").delete().eq("user_id", userId);

  const specs = phasePlanFor(months);
  const focus = (gaps.length ? gaps : ["Interview confidence"]).slice(0, 6);

  const { data: phases, error: phaseError } = await supabase
    .from("roadmap_phases")
    .insert(
      specs.map((spec, index) => ({
        user_id: userId,
        name: spec.name,
        kind: spec.kind,
        blurb: spec.blurb,
        order_index: index,
      })) as never,
    )
    .select("*");
  if (phaseError) throw phaseError;

  type Row = { id: string; kind: string };
  const rows = (phases ?? []) as unknown as Row[];

  const skillRows: { user_id: string; phase_id: string; name: string; order_index: number }[] = [];
  for (const phase of rows) {
    if (phase.kind === "learning" || phase.kind === "building") {
      focus.forEach((skill, index) => {
        skillRows.push({
          user_id: userId,
          phase_id: phase.id,
          name: titleCase(skill),
          order_index: index,
        });
      });
    }
    if (phase.kind === "visibility") {
      skillRows.push({
        user_id: userId,
        phase_id: phase.id,
        name: "Showing up as the engineer you are",
        order_index: 0,
      });
    }
  }

  if (skillRows.length === 0) return;

  const { data: skills, error: skillError } = await supabase
    .from("roadmap_skills")
    .insert(skillRows as never)
    .select("*");
  if (skillError) throw skillError;

  const phaseKindById = new Map(rows.map((p) => [p.id, p.kind]));
  const items: Record<string, unknown>[] = [];

  for (const skill of (skills ?? []) as unknown as {
    id: string;
    phase_id: string;
    name: string;
  }[]) {
    const kind = phaseKindById.get(skill.phase_id);
    if (kind === "learning") {
      const plan = planForSkill(skill.name);
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "learn",
        title: plan.course.title,
        provider: plan.course.provider,
        url: plan.course.url,
        order_index: 0,
      });
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "practice",
        title: plan.practice.title,
        difficulty: plan.practice.difficulty,
        detail: plan.practice.detail,
        target_count: plan.practice.target,
        order_index: 1,
      });
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "certify",
        title: plan.certify.title,
        provider: plan.certify.provider,
        url: plan.certify.url,
        detail: "Counts as done once you upload the certificate or add a credential link.",
        order_index: 2,
      });
    }
    if (kind === "building") {
      const plan = planForSkill(skill.name);
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "build",
        title: plan.project.title,
        detail: plan.project.detail,
        order_index: 0,
      });
    }
    if (kind === "visibility") {
      VISIBILITY_ITEMS.forEach((entry, index) => {
        items.push({
          user_id: userId,
          skill_id: skill.id,
          item_type: "visibility",
          title: entry.title,
          detail: entry.detail,
          order_index: index,
        });
      });
    }
  }

  if (items.length) {
    const { error: itemError } = await supabase.from("roadmap_items").insert(items as never);
    if (itemError) throw itemError;
  }
}
