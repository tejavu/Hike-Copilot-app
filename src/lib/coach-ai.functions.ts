import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runJobSearch } from "./job-search.server";
import { normaliseSkill, planForSkill } from "./catalog";

const schema = z.object({
  question: z.string().min(1).max(4000),
  context: z.string().max(4000).default(""),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});

const SYSTEM = `You are Hike Copilot, a warm, encouraging career coach for women in tech.
You talk like a trusted mentor who has been in the industry: direct, specific, generous with belief in her.
Never sound like corporate HR or a clinical assessment tool. No bullet-point lectures unless she asks for a list.
Keep answers under 130 words. Reference her profile and roadmap when it's relevant.
When she doubts herself, name the evidence of her progress instead of empty cheerleading.

You CAN edit her roadmap, but only through the provided tools.
- Propose the change first and wait for her to confirm, unless she already asked for it outright.
- When she confirms, call add_roadmap_item (or update_roadmap_item) and only then say it's done.
- She is allowed to decline any skill. If she says she doesn't want to learn something, don't argue or quietly leave it there — offer to take it off ("Want me to drop Kubernetes from your roadmap?") and call remove_roadmap_skill (or remove_roadmap_item for a single step) once she says yes.
- If she hasn't confirmed a removal, leave the roadmap untouched and just offer.
- If a removal tool reports finished steps with proof, tell her exactly what would be lost and only re-call it with confirm_completed once she agrees.
- Never claim you've updated, added to, removed from or changed her roadmap unless the matching tool call succeeded in this same turn. If a tool call fails or no roadmap exists yet, say so plainly and suggest she edit it from the Roadmap page instead.

You can also write her CV content, but only from what she has actually told you.
- update_cv_summary rewrites the "Profile" section at the top of her CV: 2-4 lines, third person-free plain prose, no headings, Swiss convention. Never call it "Headline", "About Me" or "Personal Statement" — the section is called Profile.
- rewrite_experience_bullets turns her plain-language description of a job into 2-4 polished bullets: start each with a strong past-tense action verb, name the real tools and systems she mentioned, and keep any number SHE gave. Pattern: "Developed a firmware scheduler for the CMS experiment's Phase-2 upgrade using MicroBlaze and FSM architectures".
- rewrite_project_description does the same for one of her projects.
- ABSOLUTE RULE: never invent a metric, percentage, team size, outcome or technology she did not state. If her description is too vague to make a bullet from, ask her one specific clarifying question instead of calling the tool. A generic-but-true bullet beats a specific-but-invented one.
- Only say her CV is updated after the matching tool returned ok. If a tool reports no match, tell her which entry titles it does have.

You can also look for jobs with find_job_recommendations.
- Call it when she asks for job ideas or agrees to a search. It reads her skills, roadmap and preferences itself — don't pass a skill list.
- Saved roles show up on her Roadmap automatically, so only say they're "on your roadmap" after the tool returns ok.
- Name a few of the roles it returned (title at company, where it's from), flag any marked is_example as examples rather than live openings, and if it returns an error say plainly that nothing new was added.`;

const ITEM_TYPES = ["learn", "practice", "certify", "build", "visibility"] as const;

const tools = [
  {
    type: "function",
    function: {
      name: "add_roadmap_item",
      description:
        "Add one concrete step to the user's roadmap under a named skill. Creates the skill if it doesn't exist yet. Only call after the user confirms.",
      parameters: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            description: "Skill heading the step belongs under, e.g. 'SQL'.",
          },
          item_type: { type: "string", enum: ITEM_TYPES },
          title: { type: "string" },
          provider: { type: "string" },
          url: { type: "string" },
          detail: { type: "string" },
          target_count: { type: "number", description: "Only for practice items: how many reps." },
        },
        required: ["skill", "item_type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_roadmap_item",
      description: "Update an existing roadmap step, found by (part of) its current title.",
      parameters: {
        type: "object",
        properties: {
          match_title: { type: "string" },
          title: { type: "string" },
          url: { type: "string" },
          provider: { type: "string" },
          detail: { type: "string" },
          target_count: { type: "number" },
        },
        required: ["match_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_roadmap_item",
      description:
        "Remove a single step from the user's roadmap, found by (part of) its title. Only call after she confirms she wants it gone.",
      parameters: {
        type: "object",
        properties: {
          match_title: { type: "string" },
          confirm_completed: {
            type: "boolean",
            description:
              "Pass true only after she has agreed to lose a completed step and its proof.",
          },
        },
        required: ["match_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_roadmap_skill",
      description:
        "Remove an entire skill and every step under it from the user's roadmap, e.g. when she says she doesn't want to learn it. Only call after she confirms.",
      parameters: {
        type: "object",
        properties: {
          skill: { type: "string" },
          confirm_completed: {
            type: "boolean",
            description:
              "Pass true only after she has agreed to lose completed steps and their proof.",
          },
        },
        required: ["skill"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_cv_summary",
      description:
        "Write or rewrite the Profile section at the top of her CV, from what she has said about herself. 2-4 lines. Never invent facts she didn't state.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "The finished 2-4 line Profile text." },
        },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rewrite_experience_bullets",
      description:
        "Replace the description of one job on her CV with polished action-verb bullets built strictly from what she described. Ask a clarifying question instead of calling this when her description is too vague.",
      parameters: {
        type: "object",
        properties: {
          match_title: {
            type: "string",
            description: "Part of the job title or employer of the entry to rewrite.",
          },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "2-4 finished bullets, each starting with a past-tense action verb.",
          },
          detail: { type: "string", description: "Optional one-line summary of the role." },
        },
        required: ["match_title", "bullets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rewrite_project_description",
      description:
        "Rewrite the description of one project on her CV from what she described. Never add outcomes or metrics she didn't state.",
      parameters: {
        type: "object",
        properties: {
          match_title: { type: "string", description: "Part of the project's title." },
          detail: { type: "string", description: "The finished one-to-two line description." },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "Optional 2-4 supporting bullets, action-verb style.",
          },
        },
        required: ["match_title", "detail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_job_recommendations",
      description:
        "Search live job boards for roles that fit her saved profile and roadmap skills, and save the new ones to her list (which feeds the Roadmap view). Only call when she asks for job suggestions or agrees to a search. Takes no skill input — the profile is read server-side.",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "How many roles to look for (1-12). Defaults to 6.",
          },
        },
      },
    },
  },
] as const;

type Supa = { from: (table: string) => any };

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

type ItemRow = {
  id: string;
  title: string;
  done: boolean;
  proof_url: string | null;
  proof_path: string | null;
};

const hasProof = (row: ItemRow) => row.done || Boolean(row.proof_url) || Boolean(row.proof_path);

async function removeItem(supabase: Supa, userId: string, args: Record<string, unknown>) {
  const match = String(args["match_title"] ?? "").trim();
  if (!match) return { ok: false, error: "match_title is required." };

  const { data, error } = await supabase
    .from("roadmap_items")
    .select("id, title, done, proof_url, proof_path")
    .eq("user_id", userId)
    .ilike("title", `%${match}%`)
    .limit(2);
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as ItemRow[];
  if (rows.length === 0) return { ok: false, error: `No roadmap step matches "${match}".` };
  if (rows.length > 1)
    return { ok: false, error: `"${match}" matches more than one step — be more specific.` };

  const row = rows[0]!;
  if (hasProof(row) && args["confirm_completed"] !== true) {
    return {
      ok: false,
      needs_confirmation: true,
      error: `"${row.title}" is already completed (with proof). Ask her to confirm losing it, then call again with confirm_completed: true.`,
    };
  }

  const { error: deleteError } = await supabase.from("roadmap_items").delete().eq("id", row.id);
  if (deleteError) return { ok: false, error: deleteError.message };
  return { ok: true, removed: row.title };
}

async function removeSkill(supabase: Supa, userId: string, args: Record<string, unknown>) {
  const skillName = String(args["skill"] ?? "").trim();
  if (!skillName) return { ok: false, error: "skill is required." };

  const { data: skills, error: skillError } = await supabase
    .from("roadmap_skills")
    .select("id, name")
    .eq("user_id", userId);
  if (skillError) return { ok: false, error: skillError.message };

  const wanted = normalise(skillName);
  const matches = ((skills ?? []) as { id: string; name: string }[]).filter(
    (s) => normalise(s.name) === wanted,
  );
  if (matches.length === 0) return { ok: false, error: `"${skillName}" isn't on her roadmap.` };

  const ids = matches.map((s) => s.id);
  const { data: items, error: itemsError } = await supabase
    .from("roadmap_items")
    .select("id, title, done, proof_url, proof_path")
    .eq("user_id", userId)
    .in("skill_id", ids);
  if (itemsError) return { ok: false, error: itemsError.message };
  const itemRows = (items ?? []) as ItemRow[];
  const completed = itemRows.filter(hasProof);

  if (completed.length > 0 && args["confirm_completed"] !== true) {
    return {
      ok: false,
      needs_confirmation: true,
      error: `Removing "${matches[0]!.name}" would also delete ${completed.length} completed step(s) with proof: ${completed
        .map((i) => i.title)
        .join(", ")}. Ask her to confirm, then call again with confirm_completed: true.`,
    };
  }

  const { error: deleteItemsError } = await supabase
    .from("roadmap_items")
    .delete()
    .eq("user_id", userId)
    .in("skill_id", ids);
  if (deleteItemsError) return { ok: false, error: deleteItemsError.message };

  const { error: deleteSkillError } = await supabase
    .from("roadmap_skills")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (deleteSkillError) return { ok: false, error: deleteSkillError.message };

  return { ok: true, removed_skill: matches[0]!.name, removed_items: itemRows.length };
}

const PHASE_FOR: Record<string, string[]> = {
  learn: ["learning"],
  practice: ["learning"],
  certify: ["learning"],
  build: ["building", "learning"],
  visibility: ["visibility", "building", "learning"],
};

async function addItem(supabase: Supa, userId: string, args: Record<string, unknown>) {
  const skillName = String(args["skill"] ?? "").trim();
  const itemType = String(args["item_type"] ?? "learn");
  const title = String(args["title"] ?? "").trim();
  if (!skillName || !title || !(ITEM_TYPES as readonly string[]).includes(itemType)) {
    return { ok: false, error: "Missing or invalid skill/title/item_type." };
  }

  const { data: phases, error: phaseError } = await supabase
    .from("roadmap_phases")
    .select("id, kind, order_index")
    .eq("user_id", userId)
    .order("order_index", { ascending: true });
  if (phaseError) return { ok: false, error: phaseError.message };
  const phaseRows = (phases ?? []) as { id: string; kind: string }[];
  if (phaseRows.length === 0) {
    return { ok: false, error: "She has no roadmap yet, so nothing can be added." };
  }

  const preferred = PHASE_FOR[itemType] ?? ["learning"];
  const phase =
    preferred.map((kind) => phaseRows.find((p) => p.kind === kind)).find(Boolean) ?? phaseRows[0]!;

  // Look across every phase, not just the preferred one — the same skill placed
  // in another phase must be reused rather than duplicated.
  const { data: existing, error: skillError } = await supabase
    .from("roadmap_skills")
    .select("id, name, phase_id, order_index, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (skillError) return { ok: false, error: skillError.message };
  const skillRows = (existing ?? []) as {
    id: string;
    name: string;
    phase_id: string;
    order_index: number;
  }[];

  const wanted = normalise(skillName);
  let skillId = skillRows.find((s) => normalise(s.name) === wanted)?.id;
  const createdSkill = !skillId;
  if (!skillId) {
    const nextIndex = skillRows
      .filter((s) => s.phase_id === phase.id)
      .reduce((max, s) => Math.max(max, s.order_index + 1), 0);
    const { data: created, error: createError } = await supabase
      .from("roadmap_skills")
      .insert({
        user_id: userId,
        phase_id: phase.id,
        name: skillName,
        order_index: nextIndex,
      } as never)
      .select("id")
      .single();
    if (createError) return { ok: false, error: createError.message };
    skillId = (created as { id: string }).id;
  }

  // Duplicate guard: never add the same step twice under one skill, however
  // the request was phrased. Matches on item type plus near-equal titles.
  const { data: existingItems, error: itemsError } = await supabase
    .from("roadmap_items")
    .select("title, item_type")
    .eq("user_id", userId)
    .eq("skill_id", skillId);
  if (itemsError) return { ok: false, error: itemsError.message };
  const itemRows = (existingItems ?? []) as { title: string; item_type: string }[];
  const wantedTitle = normalise(title);
  const dupe = itemRows.some((row) => {
    if (row.item_type !== itemType) return false;
    const t = normalise(row.title);
    return t === wantedTitle || t.includes(wantedTitle) || wantedTitle.includes(t);
  });
  if (dupe) {
    return { ok: true, already_on_roadmap: title, under: skillName };
  }

  const { data: siblings } = await supabase
    .from("roadmap_items")
    .select("order_index")
    .eq("user_id", userId)
    .eq("skill_id", skillId);
  const orderIndex = ((siblings ?? []) as { order_index: number }[]).reduce(
    (max, i) => Math.max(max, i.order_index + 1),
    0,
  );

  // A step added from chat must still point somewhere real: when the model
  // gives no link, fall back to the catalog plan for that skill.
  const plan = planForSkill(skillName);
  const suggested =
    itemType === "learn"
      ? { url: plan.course.url, provider: plan.course.provider, detail: null as string | null }
      : itemType === "practice"
        ? { url: plan.practice.url, provider: null, detail: plan.practice.detail }
        : itemType === "certify"
          ? { url: plan.certify.url, provider: plan.certify.provider, detail: null }
          : itemType === "build"
            ? { url: null, provider: null, detail: plan.project.detail }
            : { url: null, provider: null, detail: null };

  const { error: itemError } = await supabase.from("roadmap_items").insert({
    user_id: userId,
    skill_id: skillId,
    item_type: itemType,
    title,
    provider: args["provider"] ? String(args["provider"]) : suggested.provider,
    url: args["url"] ? String(args["url"]) : suggested.url,
    detail: args["detail"] ? String(args["detail"]) : suggested.detail,
    target_count: itemType === "practice" ? Number(args["target_count"] ?? 3) : null,
    order_index: orderIndex,
  } as never);
  if (itemError) return { ok: false, error: itemError.message };
  return { ok: true, added: title, under: skillName };
}

type ProfileRow = {
  skill_confidence: { name: string; level: number }[] | null;
  skills: string[] | null;
  interests: string[] | null;
  drawn_to: string | null;
  location_pref: string | null;
  work_setup: string[] | null;
  recent_role: string | null;
};

/**
 * Searches live boards using her saved profile plus her roadmap skills
 * (aspirational, so weighted lower) and saves the genuinely new roles.
 */
async function findJobRecommendations(
  supabase: Supa,
  userId: string,
  args: Record<string, unknown>,
) {
  const count = Math.min(12, Math.max(1, Number(args["count"] ?? 6) || 6));

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("skill_confidence, skills, interests, drawn_to, location_pref, work_setup, recent_role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return { ok: false, error: profileError.message };
  const profile = profileData as ProfileRow | null;
  if (!profile)
    return {
      ok: false,
      error: "She has no profile saved yet, so there's nothing to search against.",
    };

  const confirmed = profile.skill_confidence?.length
    ? profile.skill_confidence
    : (profile.skills ?? []).map((name) => ({ name, level: 3 }));

  const { data: roadmapSkills, error: skillError } = await supabase
    .from("roadmap_skills")
    .select("name")
    .eq("user_id", userId);
  if (skillError) return { ok: false, error: skillError.message };

  const seenSkill = new Set(confirmed.map((s) => normaliseSkill(s.name)));
  const skills = [...confirmed];
  for (const row of (roadmapSkills ?? []) as { name: string }[]) {
    const key = normaliseSkill(row.name);
    if (!key || seenSkill.has(key)) continue;
    seenSkill.add(key);
    skills.push({ name: row.name, level: 2 });
  }

  const result = await runJobSearch({
    skills,
    interests: profile.interests ?? [],
    drawnTo: profile.drawn_to ?? "",
    locations: (profile.location_pref ?? "")
      .split(" · ")
      .map((l) => l.trim())
      .filter(Boolean),
    setups: profile.work_setup ?? [],
    recentRole: profile.recent_role ?? "",
    count,
  });

  if (result.jobs.length === 0) {
    return { ok: false, error: `No roles came back this time. ${result.notes[0] ?? ""}`.trim() };
  }

  const { data: existing, error: existingError } = await supabase
    .from("jobs")
    .select("title, company")
    .eq("user_id", userId);
  if (existingError) return { ok: false, error: existingError.message };

  const keyOf = (title: string, company: string) =>
    `${normaliseSkill(title)}|${normaliseSkill(company)}`;
  const seen = new Set(
    ((existing ?? []) as { title: string; company: string }[]).map((j) =>
      keyOf(j.title, j.company),
    ),
  );

  const fresh = result.jobs.filter((job) => {
    const key = keyOf(job.title, job.company);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (fresh.length === 0) {
    return {
      ok: false,
      error: "Everything I found is already on her list — nothing new was added.",
    };
  }

  const { error: insertError } = await supabase
    .from("jobs")
    .insert(fresh.map((job) => ({ ...job, user_id: userId, liked: true })) as never);
  if (insertError) return { ok: false, error: insertError.message };

  return {
    ok: true,
    added: fresh.map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      is_example: job.is_example,
      url: job.url,
    })),
    skipped_duplicates: result.jobs.length - fresh.length,
    examples_only: fresh.every((job) => job.is_example),
  };
}

/** 2-4 lines, so a runaway model answer can't turn the CV header into an essay. */
function trimSummary(raw: string): string {
  const lines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(0, 4).join(" ").trim();
}

async function updateCvSummary(supabase: Supa, userId: string, args: Record<string, unknown>) {
  const summary = trimSummary(String(args["summary"] ?? ""));
  if (summary.length < 20) {
    return { ok: false, error: "summary is too short to be a Profile section." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ summary } as never)
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, summary };
}

const cleanList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 4)
    : [];

type CvEntry = Record<string, unknown> & { title?: string; company?: string };

/** Finds the one entry the user means, or explains why it couldn't. */
function findEntry(entries: CvEntry[], match: string) {
  const wanted = normalise(match);
  const hits = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      const haystack = normalise(`${entry.title ?? ""} ${entry.company ?? ""}`);
      return haystack.includes(wanted);
    });
  if (hits.length === 0) {
    return {
      error: `Nothing matches "${match}". Her entries are: ${
        entries.map((e) => e.title ?? e.company ?? "untitled").join("; ") || "none saved yet"
      }.`,
    };
  }
  if (hits.length > 1) {
    return { error: `"${match}" matches ${hits.length} entries — be more specific.` };
  }
  return { hit: hits[0]! };
}

async function rewriteCvEntry(
  supabase: Supa,
  userId: string,
  column: "experience" | "projects",
  args: Record<string, unknown>,
) {
  const match = String(args["match_title"] ?? "").trim();
  if (!match) return { ok: false, error: "match_title is required." };
  const bullets = cleanList(args["bullets"]);
  const detail = String(args["detail"] ?? "").trim();
  if (bullets.length === 0 && !detail) {
    return { ok: false, error: "Give bullets, a detail line, or both." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(column)
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const entries = ((data as Record<string, unknown> | null)?.[column] ?? []) as CvEntry[];
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, error: `She has no ${column} saved yet, so there's nothing to rewrite.` };
  }

  const found = findEntry(entries, match);
  if (!found.hit) return { ok: false, error: found.error };

  const { entry, index } = found.hit;
  const updated: CvEntry = { ...entry };
  if (detail) updated["detail"] = detail;
  if (bullets.length > 0) updated["bullets"] = bullets;

  const next = entries.slice();
  next[index] = updated;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [column]: next } as never)
    .eq("id", userId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, updated: entry.title ?? entry.company ?? match, bullets, detail };
}

async function updateItem(supabase: Supa, userId: string, args: Record<string, unknown>) {
  const match = String(args["match_title"] ?? "").trim();
  if (!match) return { ok: false, error: "match_title is required." };
  const { data, error } = await supabase
    .from("roadmap_items")
    .select("id, title")
    .eq("user_id", userId)
    .ilike("title", `%${match}%`)
    .limit(2);
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as { id: string; title: string }[];
  if (rows.length === 0) return { ok: false, error: `No roadmap step matches "${match}".` };
  if (rows.length > 1)
    return { ok: false, error: `"${match}" matches more than one step — be more specific.` };

  const patch: Record<string, unknown> = {};
  for (const key of ["title", "url", "provider", "detail"]) {
    if (args[key]) patch[key] = String(args[key]);
  }
  if (args["target_count"] != null) patch["target_count"] = Number(args["target_count"]);
  if (Object.keys(patch).length === 0) return { ok: false, error: "Nothing to change." };

  const { error: updateError } = await supabase
    .from("roadmap_items")
    .update(patch as never)
    .eq("id", rows[0]!.id);
  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, updated: rows[0]!.title };
}

export const askCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        reply: "I can't reach my brain right now, but I'm still here. Try again in a moment?",
        roadmapChanged: false,
      };
    }

    const { supabase, userId } = context as unknown as { supabase: Supa; userId: string };

    const messages: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM },
      ...(data.context
        ? [{ role: "system", content: `Her profile & progress:\n${data.context}` }]
        : []),
      ...data.history,
      { role: "user", content: data.question },
    ];

    let roadmapChanged = false;

    for (let round = 0; round < 4; round += 1) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "google/gemini-3.5-flash", messages, tools }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error("AI gateway error", response.status, body);
        if (response.status === 429) {
          return {
            reply:
              "Lots of people are talking to me at once — give me a few seconds and ask again?",
            roadmapChanged,
          };
        }
        if (response.status === 402 || response.status === 403) {
          return {
            reply:
              "My chat credits have run out for now, so I can't answer freely — but your roadmap and progress are all still here.",
            roadmapChanged,
          };
        }
        return { reply: "Something went sideways on my end. Ask me again?", roadmapChanged };
      }

      const payload = (await response.json()) as {
        choices?: {
          message?: {
            content?: string;
            tool_calls?: { id: string; function: { name: string; arguments: string } }[];
          };
        }[];
      };
      const message = payload.choices?.[0]?.message;
      const calls = message?.tool_calls ?? [];

      if (calls.length === 0) {
        return {
          reply: message?.content?.trim() ?? "I lost my train of thought there — say that again?",
          roadmapChanged,
        };
      }

      messages.push({ role: "assistant", content: message?.content ?? "", tool_calls: calls });

      for (const call of calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        const name = call.function.name as string;
        const result: { ok: boolean; [key: string]: unknown } =
          name === "add_roadmap_item"
            ? await addItem(supabase, userId, args)
            : name === "update_roadmap_item"
              ? await updateItem(supabase, userId, args)
              : name === "remove_roadmap_item"
                ? await removeItem(supabase, userId, args)
                : name === "remove_roadmap_skill"
                  ? await removeSkill(supabase, userId, args)
                  : name === "find_job_recommendations"
                    ? await findJobRecommendations(supabase, userId, args)
                    : name === "update_cv_summary"
                      ? await updateCvSummary(supabase, userId, args)
                      : name === "rewrite_experience_bullets"
                        ? await rewriteCvEntry(supabase, userId, "experience", args)
                        : name === "rewrite_project_description"
                          ? await rewriteCvEntry(supabase, userId, "projects", args)
                          : { ok: false, error: `Unknown tool ${name}` };
        if (result.ok) roadmapChanged = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return {
      reply:
        "I got tangled trying to make that change — can you tell me again exactly what you'd like added?",
      roadmapChanged,
    };
  });
