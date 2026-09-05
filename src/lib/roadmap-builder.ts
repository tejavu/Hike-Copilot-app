import { supabase } from "@/integrations/supabase/client";
import { planForSkill, titleCase, VISIBILITY_ITEMS } from "./catalog";
import { getLinkedInCourses, type LinkedInCourse } from "./linkedin-learning.functions";
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
  /** AI-written headings/blurbs. Falls back to the built-in copy when absent. */
  copy?: { phases: { kind: string; name: string; blurb: string }[]; skills: Record<string, string> } | null;
}): Promise<void> {
  const { userId, gaps, months, copy } = opts;

  // Clear any previous roadmap so regenerating never doubles up.
  await supabase.from("roadmap_phases").delete().eq("user_id", userId);

  const specs = phasePlanFor(months).map((spec, index) => {
    const written = copy?.phases?.[index];
    if (written && written.kind === spec.kind && written.name.trim()) {
      return { ...spec, name: written.name.trim(), blurb: written.blurb?.trim() || spec.blurb };
    }
    return spec;
  });
  const focus = (gaps.length ? gaps : ["Interview confidence"]).slice(0, 6);
  const headingFor = (gap: string) => copy?.skills?.[gap]?.trim() || titleCase(gap);

  // Real LinkedIn Learning courses for the Learn steps — best effort: when the
  // lookup fails the steps simply keep their curated plan without the extra line.
  let linkedInCourses: Record<string, LinkedInCourse[]> = {};
  try {
    linkedInCourses = await getLinkedInCourses({ data: { skills: focus } });
  } catch (error) {
    console.error("linkedin learning lookup failed", error);
  }
  const linkedInDetail = (gap: string): string | null => {
    const courses = linkedInCourses[gap];
    if (!courses?.length) return null;
    const links = courses.map((c) => `${c.title}: ${c.url}`).join(" · ");
    return `On LinkedIn Learning: ${links}`;
  };

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

  // Display heading -> original gap, so resource lookup still works after AI rewording.
  const gapByHeading = new Map<string, string>();
  const skillRows: { user_id: string; phase_id: string; name: string; order_index: number }[] = [];
  for (const phase of rows) {
    if (phase.kind === "learning" || phase.kind === "building") {
      focus.forEach((skill, index) => {
        const heading = headingFor(skill);
        gapByHeading.set(heading, skill);
        skillRows.push({
          user_id: userId,
          phase_id: phase.id,
          name: heading,
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
      const gap = gapByHeading.get(skill.name) ?? skill.name;
      const plan = planForSkill(gap);
      const extra = linkedInDetail(gap);
      // LinkedIn Learning (a Microsoft property) is preferred over a generic
      // Coursera search — Coursera only stands in when no real course was found.
      const liCourses = linkedInCourses[gap] ?? [];
      const preferLinkedIn = liCourses.length > 0 && /coursera/i.test(plan.course.provider);
      const primary = preferLinkedIn
        ? { title: liCourses[0]!.title, provider: LINKEDIN_LEARNING, url: liCourses[0]!.url }
        : plan.course;
      const learnDetail = preferLinkedIn
        ? liCourses.length > 1
          ? `Also on LinkedIn Learning: ${liCourses[1]!.title}: ${liCourses[1]!.url}`
          : null
        : extra;
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "learn",
        estimated_hours: 3,
        title: primary.title,
        provider: primary.provider,
        url: primary.url,
        ...(learnDetail ? { detail: learnDetail } : {}),
        order_index: 0,
      });
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "practice",
        estimated_hours: Math.min(12, Math.max(1, (plan.practice.target ?? 1) * 0.5)),
        title: plan.practice.title,
        url: plan.practice.url,
        difficulty: plan.practice.difficulty,
        detail: plan.practice.detail,
        target_count: plan.practice.target,
        order_index: 1,
      });
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "certify",
        estimated_hours: 2,
        title: plan.certify.title,
        provider: plan.certify.provider,
        url: plan.certify.url,
        detail: "Counts as done once you upload the certificate or add a credential link.",
        order_index: 2,
      });
    }
    if (kind === "building") {
      const plan = planForSkill(gapByHeading.get(skill.name) ?? skill.name);
      items.push({
        user_id: userId,
        skill_id: skill.id,
        item_type: "build",
        estimated_hours: 5,
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
          estimated_hours: 1.5,
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
