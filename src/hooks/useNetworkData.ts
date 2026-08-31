import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { EventEngagement, EventReflection, NetworkEvent, RsvpStatus } from "@/lib/events";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<NetworkEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as NetworkEvent[];
    },
  });
}

export function useEngagement() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event-engagement", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Record<string, EventEngagement>> => {
      const { data, error } = await supabase
        .from("event_engagement")
        .select("event_id, saved, rsvp_status")
        .eq("user_id", user!.id);
      if (error) throw error;
      const map: Record<string, EventEngagement> = {};
      for (const row of data ?? []) {
        map[row.event_id] = {
          event_id: row.event_id,
          saved: row.saved,
          rsvp_status: row.rsvp_status as RsvpStatus,
        };
      }
      return map;
    },
  });
}

function useEngagementMutation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return { user, invalidate: () => qc.invalidateQueries({ queryKey: ["event-engagement", user?.id] }) };
}

export function useToggleSave() {
  const { user, invalidate } = useEngagementMutation();
  return useMutation({
    mutationFn: async ({ eventId, saved }: { eventId: string; saved: boolean }) => {
      const { error } = await supabase
        .from("event_engagement")
        .upsert(
          { user_id: user!.id, event_id: eventId, saved, updated_at: new Date().toISOString() },
          { onConflict: "user_id,event_id" },
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetRsvp() {
  const { user, invalidate } = useEngagementMutation();
  return useMutation({
    mutationFn: async ({
      eventId,
      status,
      saved,
    }: {
      eventId: string;
      status: RsvpStatus;
      saved: boolean;
    }) => {
      const { error } = await supabase.from("event_engagement").upsert(
        {
          user_id: user!.id,
          event_id: eventId,
          rsvp_status: status,
          saved: status === "going" ? true : saved,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useReflections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event-reflections", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<EventReflection[]> => {
      const { data, error } = await supabase
        .from("event_reflections")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EventReflection[];
    },
  });
}

export type ReflectionInput = {
  event: NetworkEvent;
  attended: boolean;
  contacts: string[];
  takeaway: string;
  rating: number | null;
  /** Roadmap skills, so exposure can be logged against the right one. */
  roadmapSkills: { id: string; name: string }[];
};

export function useSaveReflection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReflectionInput) => {
      const { error } = await supabase.from("event_reflections").insert({
        user_id: user!.id,
        event_id: input.event.id,
        attended: input.attended,
        contacts: input.contacts,
        takeaway: input.takeaway || null,
        rating: input.rating,
      });
      if (error) throw error;

      // Transparent roadmap feedback: attending logs skill *exposure* and a
      // visibility milestone — never a claim of proficiency.
      if (!input.attended) return { loggedSkill: null as string | null };

      const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]/g, "");
      const tags = new Set(input.event.skill_tags.map(norm));
      const match =
        input.roadmapSkills.find((skill) => tags.has(norm(skill.name))) ?? input.roadmapSkills[0];
      if (!match) return { loggedSkill: null };

      const { error: itemError } = await supabase.from("roadmap_items").insert({
        user_id: user!.id,
        skill_id: match.id,
        item_type: "visibility",
        title: `Showed up: ${input.event.title}`,
        detail: `Community event logged from Network — exposure to ${input.event.skill_tags.join(", ")}. Counts as visibility, not proficiency.`,
        provider: input.event.organizer,
        url: input.event.url,
        proof_url: input.event.url,
        done: true,
        order_index: 900,
      });
      if (itemError) throw itemError;
      return { loggedSkill: match.name };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["event-reflections", user?.id] });
      void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
    },
  });
}
