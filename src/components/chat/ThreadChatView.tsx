import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import copilotLogo from "@/assets/copilot-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useJobs, useProfile, useRoadmap } from "@/hooks/useCoachData";
import { useDeleteThread, useRenameThread, useThreadMessages, useThreads } from "@/hooks/useChatThreads";
import { askCoach } from "@/lib/coach-ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage, Job, Profile } from "@/lib/domain";

export function ThreadChatView({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: jobs } = useJobs();
  const { data: roadmap } = useRoadmap();
  const { data: threads } = useThreads();
  const { data: messages, isLoading } = useThreadMessages(threadId);
  const renameThread = useRenameThread();
  const deleteThread = useDeleteThread();
  const callCoach = useServerFn(askCoach);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const thread = (threads ?? []).find((t) => t.id === threadId);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, busy]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["thread-messages", user?.id, threadId] });
    void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
    void qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    void qc.invalidateQueries({ queryKey: ["chat-threads", user?.id] });
  };

  const say = async (content: string, role: "assistant" | "user") => {
    const { error } = await supabase
      .from("chat_messages")
      .insert({ user_id: user!.id, thread_id: threadId, role, content, kind: "text", payload: null } as never);
    if (error) throw error;
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy || !user) return;
    setDraft("");
    setBusy(true);
    try {
      await say(text, "user");
      if ((messages?.length ?? 0) === 0) {
        await renameThread.mutateAsync({ id: threadId, title: text.slice(0, 60) });
      }
      const history = (messages ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content }));
      const result = await callCoach({
        data: { question: text, context: buildContext(profile, jobs, roadmap), history },
      });
      await say(result.reply, "assistant");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this chat? The messages in it will be gone.")) return;
    try {
      await deleteThread.mutateAsync(threadId);
      void navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete this chat");
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-4 md:h-screen md:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-border py-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold">{thread?.title ?? "New chat"}</h1>
          <p className="text-xs text-muted-foreground">A side conversation — your coaching chat stays untouched.</p>
        </div>
        <button
          type="button"
          onClick={() => void remove()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <Trash2 className="size-3.5" /> Delete chat
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto py-8">
        {!isLoading && (messages?.length ?? 0) === 0 && (
          <div className="mx-auto max-w-md pt-10 text-center">
            <img src={copilotLogo} alt="" width={816} height={816} className="mx-auto size-12 object-contain" />
            <p className="mt-4 text-sm text-muted-foreground">
              Ask me anything — a role you spotted, an interview you're nervous about, or a skill you want to add to
              your roadmap.
            </p>
          </div>
        )}
        {(messages ?? []).map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Hike Copilot is thinking…
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/90 py-4 backdrop-blur">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-warm">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask me anything…"
            rows={1}
            className="max-h-32 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button size="icon" className="size-11 shrink-0 rounded-xl" onClick={() => void send()} disabled={busy}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("animate-rise flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && (
        <img
          src={copilotLogo}
          alt=""
          loading="lazy"
          width={816}
          height={816}
          className="mt-1 size-8 shrink-0 object-contain"
        />
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-card-foreground shadow-warm",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function buildContext(
  profile: Profile | null | undefined,
  jobs: Job[] | undefined,
  roadmap: { items: { title: string; item_type: string }[] } | undefined,
): string {
  if (!profile) return "";
  return [
    `Name: ${profile.full_name ?? "unknown"}`,
    `Goal: ${profile.goal ?? "not set"}`,
    `Timeline: ${profile.timeline ?? "not set"}`,
    `Skills: ${profile.skills.join(", ") || "none listed"}`,
    `Interests: ${profile.interests.join(", ") || "none listed"}`,
    `CV summary: ${profile.summary ?? "not written yet"}`,
    `CV experience entries: ${(profile.experience ?? []).map((e) => [e.title, e.company].filter(Boolean).join(" at ")).join("; ") || "none"}`,
    `CV project entries: ${(profile.projects ?? []).map((p) => p.title).join("; ") || "none"}`,
    `Liked roles: ${(jobs ?? []).filter((j) => j.liked).map((j) => `${j.title} at ${j.company}`).join("; ") || "none"}`,
    `Roadmap steps: ${(roadmap?.items ?? []).length}`,
  ].join("\n");
}
