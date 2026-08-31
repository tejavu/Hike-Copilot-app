import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  MatchStatus,
  Mentor,
  MentorAction,
  MentorMatch,
  MentorPreferences,
  MentorSession,
  ReminderCadence,
  SessionStatus,
} from "@/lib/mentors";

export function useMentors() {
  return useQuery({
    queryKey: ["mentors"],
    queryFn: async (): Promise<Mentor[]> => {
      const { data, error } = await supabase.from("mentors").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as Mentor[];
    },
  });
}

export function useMentorPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-preferences", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<MentorPreferences | null> => {
      const { data, error } = await supabase
        .from("mentor_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MentorPreferences | null;
    },
  });
}

export function useSavePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<MentorPreferences>) => {
      const { error } = await supabase.from("mentor_preferences").upsert(
        { user_id: user!.id, ...patch, updated_at: new Date().toISOString() } as never,
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor-preferences", user?.id] }),
  });
}

export function useMentorMatches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-matches", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<MentorMatch[]> => {
      const { data, error } = await supabase
        .from("mentor_matches")
        .select("id, mentor_id, score, reasons, matched_attributes, status")
        .eq("user_id", user!.id)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MentorMatch[];
    },
  });
}

export type MatchRecord = {
  mentor_id: string;
  score: number;
  reasons: string[];
  matched_attributes: string[];
  status?: MatchStatus;
};

/** Persists the current match run so the shortlist and history survive reloads. */
export function useRecordMatches() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: MatchRecord[]) => {
      if (records.length === 0) return;
      const { error } = await supabase.from("mentor_matches").upsert(
        records.map((record) => ({
          user_id: user!.id,
          mentor_id: record.mentor_id,
          score: record.score,
          reasons: record.reasons,
          matched_attributes: record.matched_attributes,
          updated_at: new Date().toISOString(),
        })) as never,
        { onConflict: "user_id,mentor_id", ignoreDuplicates: false },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor-matches", user?.id] }),
  });
}

export function useSetMatchStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mentorId,
      status,
      score = 0,
      reasons = [],
      matchedAttributes = [],
    }: {
      mentorId: string;
      status: MatchStatus;
      score?: number;
      reasons?: string[];
      matchedAttributes?: string[];
    }) => {
      const { error } = await supabase.from("mentor_matches").upsert(
        {
          user_id: user!.id,
          mentor_id: mentorId,
          status,
          score,
          reasons,
          matched_attributes: matchedAttributes,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "user_id,mentor_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mentor-matches", user?.id] });
      void qc.invalidateQueries({ queryKey: ["mentor-preferences", user?.id] });
    },
  });
}

export function useMentorSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-sessions", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<MentorSession[]> => {
      const { data, error } = await supabase
        .from("mentor_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MentorSession[];
    },
  });
}

export function useCreateSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      mentorId: string;
      startsAt: string;
      endsAt: string;
      theme: string;
      agenda?: string | null;
      prepQuestions?: string[];
    }): Promise<MentorSession> => {
      const { data, error } = await supabase
        .from("mentor_sessions")
        .insert({
          user_id: user!.id,
          mentor_id: input.mentorId,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          theme: input.theme,
          agenda: input.agenda ?? null,
          prep_questions: input.prepQuestions ?? [],
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as MentorSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor-sessions", user?.id] }),
  });
}

export function useUpdateSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        starts_at: string;
        ends_at: string;
        theme: string;
        agenda: string | null;
        prep_questions: string[];
        status: SessionStatus;
        recap: string | null;
        key_advice: string | null;
        recap_source: string;
        next_check_in_at: string | null;
      }>;
    }) => {
      const { error } = await supabase
        .from("mentor_sessions")
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentor-sessions", user?.id] }),
  });
}

export function useMentorActions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mentor-actions", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<MentorAction[]> => {
      const { data, error } = await supabase
        .from("mentor_actions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MentorAction[];
    },
  });
}

export type NewActionInput = {
  sessionId: string | null;
  mentorId: string | null;
  title: string;
  detail?: string | null;
  dueDate?: string | null;
  /** When set, the action is also mirrored onto the roadmap as a visibility item. */
  roadmapSkillId?: string | null;
  mentorName?: string;
};

export function useAddActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: NewActionInput[]) => {
      for (const input of inputs) {
        let roadmapItemId: string | null = null;

        // Transparent roadmap link: a mentor action becomes a visibility item on
        // the roadmap. It records agreed work, never claimed proficiency.
        if (input.roadmapSkillId) {
          const { data, error } = await supabase
            .from("roadmap_items")
            .insert({
              user_id: user!.id,
              skill_id: input.roadmapSkillId,
              item_type: "visibility",
              title: `Mentor action: ${input.title}`,
              detail: input.mentorName
                ? `Agreed with ${input.mentorName} in a mentoring session. Tracked as committed work, not proven skill.`
                : "Agreed in a mentoring session. Tracked as committed work, not proven skill.",
              provider: input.mentorName ?? null,
              done: false,
              order_index: 950,
            } as never)
            .select("id")
            .single();
          if (error) throw error;
          roadmapItemId = (data as { id: string }).id;
        }

        const { error: actionError } = await supabase.from("mentor_actions").insert({
          user_id: user!.id,
          session_id: input.sessionId,
          mentor_id: input.mentorId,
          title: input.title,
          detail: input.detail ?? null,
          due_date: input.dueDate ?? null,
          roadmap_item_id: roadmapItemId,
        } as never);
        if (actionError) throw actionError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mentor-actions", user?.id] });
      void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
    },
  });
}

export function useToggleAction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: MentorAction) => {
      const done = !action.done;
      const { error } = await supabase
        .from("mentor_actions")
        .update({ done, updated_at: new Date().toISOString() } as never)
        .eq("id", action.id);
      if (error) throw error;
      if (action.roadmap_item_id) {
        const { error: itemError } = await supabase
          .from("roadmap_items")
          .update({ done, updated_at: new Date().toISOString() } as never)
          .eq("id", action.roadmap_item_id);
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mentor-actions", user?.id] });
      void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
    },
  });
}

export function useSetReminderCadence() {
  const save = useSavePreferences();
  return {
    ...save,
    setCadence: (cadence: ReminderCadence, nextCheckIn: string | null) =>
      save.mutateAsync({ reminder_cadence: cadence, next_check_in_at: nextCheckIn, reminder_pending: false }),
  };
}
