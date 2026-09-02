import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage } from "@/lib/domain";

export type ChatThread = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export function useThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<ChatThread[]> => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ChatThread[];
    },
  });
}

/** Messages belonging to one extra chat (the main coaching chat has thread_id null). */
export function useThreadMessages(threadId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thread-messages", user?.id, threadId],
    enabled: Boolean(user && threadId),
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user!.id)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });
}

export function useCreateThread() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string = "New chat"): Promise<ChatThread> => {
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: user!.id, title } as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ChatThread;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
  });
}

export function useRenameThread() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("chat_threads").update({ title } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
  });
}

export function useDeleteThread() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] }),
  });
}
