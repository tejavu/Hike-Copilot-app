import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
- Never claim you've updated, added to, removed from or changed her roadmap unless the matching tool call succeeded in this same turn. If a tool call fails or no roadmap exists yet, say so plainly and suggest she edit it from the Roadmap page instead.`;

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
          skill: { type: "string", description: "Skill heading the step belongs under, e.g. 'SQL'." },
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
            description: "Pass true only after she has agreed to lose a completed step and its proof.",
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
            description: "Pass true only after she has agreed to lose completed steps and their proof.",
          },
        },
        required: ["skill"],
      },
    },
  },
] as const;

type Supa = { from: (table: string) => any };

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

type ItemRow = { id: string; title: string; done: boolean; proof_url: string | null; proof_path: string | null };

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
  if (rows.length > 1) return { ok: false, error: `"${match}" matches more than one step — be more specific.` };

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
  if (!skillId) {
    const nextIndex = skillRows
      .filter((s) => s.phase_id === phase.id)
      .reduce((max, s) => Math.max(max, s.order_index + 1), 0);
    const { data: created, error: createError } = await supabase
      .from("roadmap_skills")
      .insert({ user_id: userId, phase_id: phase.id, name: skillName, order_index: nextIndex } as never)
      .select("id")
      .single();
    if (createError) return { ok: false, error: createError.message };
    skillId = (created as { id: string }).id;
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

  const { error: itemError } = await supabase.from("roadmap_items").insert({
    user_id: userId,
    skill_id: skillId,
    item_type: itemType,
    title,
    provider: args["provider"] ? String(args["provider"]) : null,
    url: args["url"] ? String(args["url"]) : null,
    detail: args["detail"] ? String(args["detail"]) : null,
    target_count: itemType === "practice" ? Number(args["target_count"] ?? 3) : null,
    order_index: orderIndex,
  } as never);
  if (itemError) return { ok: false, error: itemError.message };
  return { ok: true, added: title, under: skillName };
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
  if (rows.length > 1) return { ok: false, error: `"${match}" matches more than one step — be more specific.` };

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
      return { reply: "I can't reach my brain right now, but I'm still here. Try again in a moment?", roadmapChanged: false };
    }

    const { supabase, userId } = context as unknown as { supabase: Supa; userId: string };

    const messages: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM },
      ...(data.context ? [{ role: "system", content: `Her profile & progress:\n${data.context}` }] : []),
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
          return { reply: "Lots of people are talking to me at once — give me a few seconds and ask again?", roadmapChanged };
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
                  : { ok: false, error: `Unknown tool ${name}` };
        if (result.ok) roadmapChanged = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return {
      reply: "I got tangled trying to make that change — can you tell me again exactly what you'd like added?",
      roadmapChanged,
    };
  });
