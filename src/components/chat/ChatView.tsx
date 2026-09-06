import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  FileUp,
  Heart,
  Loader2,
  MessageSquareHeart,
  PartyPopper,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import copilotLogo from "@/assets/copilot-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useDocuments,
  useJobs,
  useMessages,
  useProfile,
  useResetCoach,
  useRoadmap,
  useUpdateJob,
  useUpdateProfile,
} from "@/hooks/useCoachData";
import { askCoach } from "@/lib/coach-ai.functions";
import { parseCvDocuments } from "@/lib/cv-parse.functions";
import { formatEntryLine } from "@/lib/cv-entry";
import { normaliseAnswer } from "@/lib/profile-parse.functions";
import { writeRoadmapCopy } from "@/lib/roadmap-copy.functions";
import { searchJobs } from "@/lib/job-search.functions";
import { JobPicker } from "@/components/jobs/JobPicker";
import { CH_LOCATION_OPTIONS, skillGap } from "@/lib/job-sweep";
import { generateRoadmap, phasePlanFor } from "@/lib/roadmap-builder";
import {
  PROMPTS,
  firstName,
  nextQuestionStage,
  parseMonths,
  splitList,
  type Stage,
} from "@/lib/coach-script";
import { type ChatMessage, type Job, type Profile } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  user_id: "",
  role: "assistant",
  content:
    "Welcome to Hike Copilot! I'm here to help with your CV, your roadmap, and finding roles that match your skills — what would you like to work on?",
  kind: "text",
  payload: null,
  created_at: new Date().toISOString(),
};


function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "txt" || ext === "md") return "text/plain";
  return "application/octet-stream";
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function ChatView() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: messages, isLoading } = useMessages();
  const { data: jobs } = useJobs();
  const { data: docs } = useDocuments();
  const { data: roadmap } = useRoadmap();
  const updateProfile = useUpdateProfile();
  const updateJob = useUpdateJob();
  const callCoach = useServerFn(askCoach);
  const readDocuments = useServerFn(parseCvDocuments);
  const cleanAnswer = useServerFn(normaliseAnswer);
  const roadmapCopy = useServerFn(writeRoadmapCopy);
  const findJobs = useServerFn(searchJobs);
  const resetCoach = useResetCoach();

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  const stage = (profile?.onboarding_stage ?? "welcome") as Stage;
  const uploadedPath = (docs?.length ?? 0) > 0;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["messages", user?.id] });
    void qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    void qc.invalidateQueries({ queryKey: ["jobs", user?.id] });
    void qc.invalidateQueries({ queryKey: ["documents", user?.id] });
    void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
  };

  const clearChat = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .is("thread_id", null);
      if (error) throw error;
      seeded.current = false;
      refresh();
      toast.success("Chat cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't clear chat");
    } finally {
      setBusy(false);
    }
  };

  const startOver = async () => {
    if (
      !user ||
      !confirm("This clears your chat, roadmap and matches and restarts onboarding. Are you sure?")
    )
      return;
    setBusy(true);
    try {
      await resetCoach.mutateAsync({ full: true });
      seeded.current = false;
      toast.success("Starting fresh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't restart");
    } finally {
      setBusy(false);
    }
  };

  const say = async (
    content: string,
    kind: ChatMessage["kind"] = "text",
    payload: Record<string, unknown> | null = null,
    role: "assistant" | "user" = "assistant",
  ) => {
    const { error } = await supabase
      .from("chat_messages")
      .insert({ user_id: user!.id, role, content, kind, payload } as never);
    if (error) throw error;
  };

  // First-ever greeting.
  useEffect(() => {
    if (isLoading || seeded.current || !user || !profile) return;
    if ((messages?.length ?? 0) > 0) return;
    if (stage !== "welcome") return;
    seeded.current = true;
    void (async () => {
      await say(
        `Hi ${firstName(profile)}, welcome to Hike. I'm your career copilot — over the next few minutes I'll learn where you're headed and build a roadmap to get you there.\n\nFirst, one quick choice about how you'd like to start.`,
        "path_choice",
      );
      refresh();
    })();
  }, [isLoading, messages, user, profile]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length, busy]);

  // The newest message of each interactive kind owns its widget, so a stray
  // typed reply never hides the cards the user still has to act on.
  const widgetIds = useMemo(() => {
    const newest = new Map<string, string>();
    for (const msg of messages ?? []) {
      if (msg.role === "assistant" && msg.kind !== "text") newest.set(msg.kind, msg.id);
    }
    return new Set(newest.values());
  }, [messages]);

  const showWidget = (message: ChatMessage) => {
    if (!widgetIds.has(message.id)) return false;
    if (message.kind === "path_choice" || message.kind === "upload") {
      return stage === "welcome" || stage === "upload";
    }
    return true;
  };

  const choosePath = async (path: "questions" | "upload") => {
    setBusy(true);
    try {
      if (path === "questions") {
        await say("I'll answer your questions.", "text", null, "user");
        await say(PROMPTS["q_interests"] as string);
        await updateProfile.mutateAsync({ onboarding_stage: "q_interests" });
      } else {
        await say("I'd rather share my documents.", "text", null, "user");
        await say(
          "Perfect — send over whatever you have. Resume, transcripts, certificates. I'll read them so you don't have to retype your whole life.",
          "upload",
        );
        await updateProfile.mutateAsync({ onboarding_stage: "upload" });
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!profile || files.length === 0) return;
    setBusy(true);
    try {
      const names: string[] = [];
      const payload: {
        fileName: string;
        mimeType: string;
        dataUrl?: string;
        text?: string;
      }[] = [];

      for (const file of files.slice(0, 5)) {
        const path = `${user!.id}/docs/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("user-files").upload(path, file);
        if (error) throw error;
        await supabase.from("user_documents").insert({
          user_id: user!.id,
          kind: "document",
          file_name: file.name,
          storage_path: path,
        } as never);
        names.push(file.name);

        const mimeType = file.type || guessMime(file.name);
        if (mimeType.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
          payload.push({ fileName: file.name, mimeType, text: await file.text() });
        } else if (mimeType === "application/pdf" || mimeType.startsWith("image/")) {
          payload.push({ fileName: file.name, mimeType, dataUrl: await toDataUrl(file) });
        } else {
          payload.push({ fileName: file.name, mimeType });
        }
      }

      await say(`Uploaded: ${names.join(", ")}`, "text", null, "user");
      toast.success("Documents saved");

      const { parsed, error } = await readDocuments({ data: { files: payload } });

      if (error) {
        await say(
          `${error}\n\nYour files are saved either way. Let's do this the quick way instead.\n\n${PROMPTS["q_interests"]}`,
        );
        await updateProfile.mutateAsync({ onboarding_stage: "q_interests" });
        refresh();
        return;
      }

      const patch: Partial<Profile> = {};
      if (parsed.full_name && !profile.full_name) patch.full_name = parsed.full_name;
      if (parsed.skills.length) patch.skills = parsed.skills;
      if (parsed.interests.length) patch.interests = parsed.interests;
      if (parsed.education.length) patch.education = parsed.education;
      if (parsed.experience.length) patch.experience = parsed.experience;
      if (parsed.projects.length) patch.projects = parsed.projects;
      if (parsed.certifications.length) patch.certifications = parsed.certifications;

      const lines = [
        parsed.summary ?? "Read it — here's what I picked up.",
        "",
        parsed.skills.length ? `Skills: ${parsed.skills.join(", ")}` : null,
        parsed.interests.length ? `Leaning toward: ${parsed.interests.join(", ")}` : null,
        parsed.education.length
          ? `Education: ${parsed.education
              .map((e) => formatEntryLine({ title: e.title, org: e.institution, period: e.period }))
              .join(" · ")}`
          : null,
        parsed.experience.length
          ? `Experience: ${parsed.experience
              .map((e) => formatEntryLine({ title: e.title, org: e.company, period: e.period }))
              .join(" · ")}`
          : null,
        parsed.certifications.length ? `Certifications: ${parsed.certifications.join(", ")}` : null,
      ].filter(Boolean) as string[];

      const haveEnough = parsed.skills.length > 0 && parsed.interests.length > 0;
      const merged: Profile = { ...profile, ...patch };

      if (haveEnough) {
        await say(
          `${lines.join("\n")}\n\nIf anything's off, just tell me and I'll correct it. Otherwise — let's go looking for roles.`,
        );
        await updateProfile.mutateAsync({ ...patch, onboarding_stage: "jobs" });
        await startJobSweep(merged);
      } else {
        await say(
          `${lines.join("\n")}\n\nOne thing I couldn't read off the page.\n\n${PROMPTS["q_interests"]}`,
        );
        await updateProfile.mutateAsync({ ...patch, onboarding_stage: "q_interests" });
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const startJobSweep = async (currentProfile: Profile) => {
    await supabase.from("jobs").delete().eq("user_id", currentProfile.id);
    const result = await findJobs({
      data: {
        skills: currentProfile.skill_confidence?.length
          ? currentProfile.skill_confidence
          : currentProfile.skills.map((name) => ({ name, level: 3 })),
        interests: currentProfile.interests,
        drawnTo: currentProfile.drawn_to ?? "",
        // Onboarding sweep stays inside Switzerland.
        locations: (currentProfile.location_pref ?? "")
          .split(" · ")
          .map((l) => l.trim())
          .filter((l) => CH_LOCATION_OPTIONS.includes(l)),
        setups: currentProfile.work_setup,
        recentRole: currentProfile.recent_role ?? "",
        experience: currentProfile.experience ?? [],
        count: 10,
      },
    });

    if (result.jobs.length === 0) {
      await say(
        `I went looking and came back empty-handed this time — that happens with very specific profiles.\n\n${result.notes[0] ?? "Add another skill or a second location and I'll search again."}`,
      );
      return;
    }

    const { error } = await supabase
      .from("jobs")
      .insert(result.jobs.map((job) => ({ ...job, user_id: currentProfile.id })) as never);
    if (error) throw error;
    await say(
      result.examplesOnly
        ? `No live postings matched yet, so here are ${result.jobs.length} example roles that show the shape of what fits you.\n\nKeep the ones that spark something — I'll use them to build your roadmap while I keep looking for live openings.`
        : `Right — I went looking. Here are ${result.jobs.length} openings that fit the direction you're pointing in.\n\nKeep the ones that make you a little bit excited, even the ones that feel like a stretch. Especially those, honestly.`,
      "jobs",
    );
    await updateProfile.mutateAsync({ onboarding_stage: "jobs" });
  };

  const cleanList = async (
    field: "interests" | "skills" | "education" | "experience" | "certifications",
    text: string,
  ): Promise<string[]> => {
    try {
      const { items } = await cleanAnswer({ data: { field, text } });
      if (items) return items;
    } catch (error) {
      console.error("normalise failed", error);
    }
    return splitList(text);
  };

  const answerQuestion = async (text: string) => {
    if (!profile) return;
    const patch: Partial<Profile> = {};
    switch (stage) {
      case "q_interests":
        patch.interests = await cleanList("interests", text);
        break;
      case "q_skills":
        patch.skills = await cleanList("skills", text);
        break;
      case "q_education":
        patch.education = (await cleanList("education", text)).map((title) => ({ title }));
        break;
      case "q_quals":
        patch.experience = (await cleanList("experience", text)).map((title) => ({ title }));
        break;
      case "q_certs":
        patch.certifications = await cleanList("certifications", text);
        break;
      default:
        break;
    }

    const next = nextQuestionStage(stage, uploadedPath);
    const merged: Profile = { ...profile, ...patch };
    await updateProfile.mutateAsync({ ...patch, onboarding_stage: next });

    if (next === "jobs") {
      await startJobSweep(merged);
    } else {
      await say(PROMPTS[next] as string);
    }
  };

  const decideJob = async (job: Job, liked: boolean) => {
    await updateJob.mutateAsync({ id: job.id, patch: { liked } });
    const remaining = (jobs ?? []).filter((j) => j.id !== job.id && j.liked === null);
    if (remaining.length > 0) return;

    const decided = (jobs ?? []).map((j) => (j.id === job.id ? { ...j, liked } : j));
    const likedJobs = decided.filter((j) => j.liked);
    const jobSkills = likedJobs.flatMap((j) => j.required_skills);
    const { strengths, gaps } = skillGap(profile?.skills ?? [], jobSkills);

    setBusy(true);
    try {
      if (likedJobs.length === 0) {
        await say(
          "None of those landed — that's useful information, not a failure. Tell me what was missing and I'll go again.",
        );
      } else {
        await say(
          `I compared you against those ${likedJobs.length} role${likedJobs.length > 1 ? "s" : ""}. Here's the honest picture — and it's a good one.`,
          "gap",
          { strengths, gaps },
        );
        await say(PROMPTS["q_timeline"] as string);
        await updateProfile.mutateAsync({ onboarding_stage: "q_timeline" });
      }
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const finishOnboarding = async (goal: string) => {
    if (!profile) return;
    const jobSkills = (jobs ?? []).filter((j) => j.liked).flatMap((j) => j.required_skills);
    const { gaps } = skillGap(profile.skills, jobSkills);
    const months = profile.timeline_months ?? 6;
    const likedRoles = (jobs ?? [])
      .filter((j) => j.liked)
      .map((j) => `${j.title} at ${j.company}`)
      .slice(0, 8);

    let copy = null;
    try {
      const result = await roadmapCopy({
        data: {
          goal,
          months,
          gaps: gaps.slice(0, 6),
          roles: likedRoles,
          phases: phasePlanFor(months).map((p) => ({ kind: p.kind, name: p.name, blurb: p.blurb })),
        },
      });
      copy = result.copy;
    } catch (error) {
      console.error("roadmap copy failed", error);
    }

    await generateRoadmap({
      userId: profile.id,
      gaps,
      months,
      copy,
    });
    await updateProfile.mutateAsync({
      goal,
      onboarding_stage: "done",
      onboarding_complete: true,
      roadmap_generated: true,
    });
    await say(
      `"${goal}" — I'm writing that down, because that's what everything below is in service of.\n\nYour roadmap is ready. ${gaps.length} skill${gaps.length === 1 ? "" : "s"} to close, sequenced so you're never guessing what's next. Roadmap, Network and Mentor Match are unlocked now.\n\nYou don't have to feel ready. You just have to start.`,
      "roadmap_ready",
    );
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    try {
      await say(text, "text", null, "user");

      if (stage === "q_timeline") {
        const months = parseMonths(text);
        await updateProfile.mutateAsync({
          timeline: text,
          timeline_months: months,
          onboarding_stage: "q_goal",
        });
        await say(
          `${months} month${months === 1 ? "" : "s"} — that's workable, and I'll shape the phases around it.\n\n${PROMPTS["q_goal"]}`,
        );
      } else if (stage === "q_goal") {
        await finishOnboarding(text);
      } else if (stage === "jobs") {
        await say(
          "Swipe through the roles above first — like or pass on each one and I'll take it from there.",
        );
      } else if (stage.startsWith("q_")) {
        await answerQuestion(text);
      } else if (stage === "welcome" || stage === "upload") {
        await say(
          "Pick one of the two options above and we'll get going — questions or documents, whichever feels lighter today.",
        );
      } else {
        const context = buildContext(profile, jobs, roadmap);
        const history = (messages ?? [])
          .slice(-8)
          .filter((m) => m.kind === "text")
          .map((m) => ({ role: m.role, content: m.content }));
        const result = await callCoach({ data: { question: text, context, history } });
        await say(result.reply);
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col px-4 md:h-screen md:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-border py-4">
        <div>
          <h1 className="font-display text-lg font-semibold">Chat with Hike Copilot</h1>
          <p className="text-xs text-muted-foreground">
            Ask anything about your career, roadmap or job search.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void clearChat()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Clear chat
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startOver()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" /> Start over
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto py-8">
        {!isLoading && (messages?.length ?? 0) === 0 && stage === "done" && (
          <Bubble message={WELCOME_MESSAGE} />
        )}
        {(messages ?? []).map((message) => (
          <div key={message.id} className="animate-rise space-y-3">
            <Bubble message={message} />
            {showWidget(message) && (
              <Interactive
                message={message}
                jobs={jobs ?? []}
                busy={busy}
                onChoosePath={choosePath}
                onUpload={uploadFiles}
                onDecideJob={decideJob}

              />
            )}
          </div>
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
            placeholder={stage === "done" ? "Ask me anything…" : "Type your answer…"}
            rows={1}
            className="max-h-32 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            className="size-11 shrink-0 rounded-xl"
            onClick={() => void send()}
            disabled={busy}
          >
            <Send className="size-4" />
          </Button>
        </div>
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
  const done = (roadmap?.items ?? []).length;
  return [
    `Name: ${profile.full_name ?? "unknown"}`,
    `Goal: ${profile.goal ?? "not set"}`,
    `Timeline: ${profile.timeline ?? "not set"}`,
    `Skills: ${profile.skills.join(", ") || "none listed"}`,
    `Interests: ${profile.interests.join(", ") || "none listed"}`,
    `CV summary: ${profile.summary ?? "not written yet"}`,
    `CV experience entries: ${(profile.experience ?? []).map((e) => [e.title, e.company].filter(Boolean).join(" at ")).join("; ") || "none"}`,
    `CV project entries: ${(profile.projects ?? []).map((p) => p.title).join("; ") || "none"}`,
    `Liked roles: ${
      (jobs ?? [])
        .filter((j) => j.liked)
        .map((j) => `${j.title} at ${j.company}`)
        .join("; ") || "none"
    }`,
    `Roadmap steps: ${done}`,
  ].join("\n");
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
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
      <Message from={message.role} className="w-auto max-w-[85%]">
        <MessageContent
          className={cn(
            "leading-relaxed",
            isUser
              ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
              : "rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-foreground",
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <MessageResponse className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:my-1 [&_ol]:my-3 [&_ol]:pl-5 [&_p]:my-3 [&_strong]:font-semibold [&_ul]:my-3 [&_ul]:pl-5">
              {message.content}
            </MessageResponse>
          )}
        </MessageContent>
      </Message>
    </div>
  );
}


function Interactive({
  message,
  jobs,
  busy,
  onChoosePath,
  onUpload,
  onDecideJob,
}: {
  message: ChatMessage;
  jobs: Job[];
  busy: boolean;
  onChoosePath: (path: "questions" | "upload") => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  onDecideJob: (job: Job, liked: boolean) => Promise<void>;
}) {
  if (message.kind === "path_choice") {
    return (
      <div className="ml-11 grid gap-3 sm:grid-cols-2">
        <button
          disabled={busy}
          onClick={() => void onChoosePath("questions")}
          className="group rounded-2xl border border-border bg-card p-4 text-left shadow-warm transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60"
        >
          <MessageSquareHeart className="size-5 text-primary" />
          <p className="mt-2.5 font-semibold">Talk it through</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One friendly question at a time — interests, skills, education, certificates.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            Let's talk{" "}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
        <label
          className={cn(
            "group cursor-pointer rounded-2xl border border-border bg-card p-4 text-left shadow-warm transition-all hover:-translate-y-0.5 hover:shadow-lift",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <FileUp className="size-5 text-plum" />
          <p className="mt-2.5 font-semibold">Send my documents</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Resume, transcripts, certificates. I'll build your profile from those.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-plum">
            Choose files{" "}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (!e.target.files?.length) return;
              const picked = Array.from(e.target.files);
              void onChoosePath("upload").then(() => onUpload(picked));
            }}
          />
        </label>
      </div>
    );
  }

  if (message.kind === "upload") {
    return (
      <div className="ml-11">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-warm transition-all hover:-translate-y-0.5">
          <FileUp className="size-4 text-plum" /> Choose files
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length) void onUpload(Array.from(e.target.files));
            }}
          />
        </label>
      </div>
    );
  }

  if (message.kind === "jobs") {
    if (jobs.length === 0) return null;
    const kept = jobs.filter((j) => j.liked).length;
    const undecided = jobs.filter((j) => j.liked === null).length;
    return (
      <div className="ml-11 space-y-3">
        <JobPicker jobs={jobs} busy={busy} onDecide={onDecideJob} />
        <p className="text-xs text-muted-foreground">
          {kept} kept{undecided > 0 ? ` · ${undecided} still to decide on` : " · all decided"}
        </p>
      </div>
    );
  }

  if (message.kind === "gap") {
    const payload = (message.payload ?? {}) as { strengths?: string[]; gaps?: string[] };
    return (
      <div className="ml-11 grid gap-3 sm:grid-cols-2">
        <div className="animate-pop rounded-2xl border border-success/30 bg-success/10 p-4">
          <p className="text-xs font-semibold tracking-wide text-success uppercase">
            Already yours
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(payload.strengths ?? []).length ? (
              payload.strengths!.map((skill) => (
                <Badge key={skill} className="border-0 bg-success text-success-foreground">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                We're starting fresh here — and fresh is a perfectly good place to start.
              </p>
            )}
          </div>
        </div>
        <div className="animate-pop rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Next to grow</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(payload.gaps ?? []).map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="border-primary/40 bg-card text-foreground"
              >
                {skill}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Not deficits — just the next few things you haven't got to yet.
          </p>
        </div>
      </div>
    );
  }

  if (message.kind === "roadmap_ready") {
    return (
      <div className="ml-11">
        <Link
          to="/roadmap"
          className="animate-pop inline-flex items-center gap-2 rounded-xl bg-warm-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
        >
          <PartyPopper className="size-4" /> Open my roadmap
        </Link>
      </div>
    );
  }

  return null;
}
