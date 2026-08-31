import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  ChatMessage,
  Job,
  Profile,
  RoadmapItem,
  RoadmapPhase,
  RoadmapSkill,
} from "@/lib/domain";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user!.id, email: user!.email ?? null })
          .select("*")
          .single();
        if (insertError) throw insertError;
        return created as unknown as Profile;
      }
      return data as unknown as Profile;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { error } = await supabase.from("profiles").update(patch as never).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });
}

export function useMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });
}

export function useJobs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jobs", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Job[];
    },
  });
}

export function useRoadmap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["roadmap", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<{
      phases: RoadmapPhase[];
      skills: RoadmapSkill[];
      items: RoadmapItem[];
    }> => {
      const [phases, skills, items] = await Promise.all([
        supabase
          .from("roadmap_phases")
          .select("*")
          .eq("user_id", user!.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("roadmap_skills")
          .select("*")
          .eq("user_id", user!.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("roadmap_items")
          .select("*")
          .eq("user_id", user!.id)
          .order("order_index", { ascending: true }),
      ]);
      if (phases.error) throw phases.error;
      if (skills.error) throw skills.error;
      if (items.error) throw items.error;
      return {
        phases: (phases.data ?? []) as unknown as RoadmapPhase[],
        skills: (skills.data ?? []) as unknown as RoadmapSkill[],
        items: (items.data ?? []) as unknown as RoadmapItem[],
      };
    },
  });
}

export function useUpdateItem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RoadmapItem> }) => {
      const { error } = await supabase.from("roadmap_items").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap", user?.id] }),
  });
}

export function useUpdateJob() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Job> }) => {
      const { error } = await supabase.from("jobs").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", user?.id] }),
  });
}

export function useDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["documents", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
