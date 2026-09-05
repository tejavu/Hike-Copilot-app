import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  Hammer,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useJobs, useProfile, useRoadmap, useUpdateJob } from "@/hooks/useCoachData";
import {
  APPLICATION_STATUSES,
  isItemComplete,
  skillProgress,
  type ApplicationStatus,
  type Job,
  type RoadmapItem,
  type RoadmapPhase,
  type RoadmapSkill,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ThisWeekPanel } from "@/components/roadmap/ThisWeekPanel";
import { ItemControls } from "@/components/roadmap/ItemControls";


export function RoadmapView() {
  const { data: profile } = useProfile();
  const { data: roadmap, isLoading } = useRoadmap();
  const { data: jobs } = useJobs();

  const phases = roadmap?.phases ?? [];
  const skills = roadmap?.skills ?? [];
  const items = roadmap?.items ?? [];

  const overall = useMemo(() => skillProgress(items), [items]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Your roadmap isn't built yet</h1>
        <p className="mt-3 text-muted-foreground">
          Finish our chat and I'll turn everything you told me into a plan you can actually follow.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl bg-warm-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift"
        >
          Back to chat
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 md:px-10">
      <header className="pt-10 pb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Your roadmap</p>
        <h1 className="mt-2 font-display text-4xl leading-tight font-semibold tracking-tight">
          {profile?.goal ? profile.goal : "One step at a time"}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {profile?.timeline ? `${profile.timeline} — ` : ""}sequenced so you never have to wonder what's next. Every
          box you tick here is proof, not busywork.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-warm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Overall progress</p>
              <p className="text-xs text-muted-foreground">
                {overall.done} of {overall.total} steps complete
              </p>
            </div>
            <p className="font-display text-3xl font-semibold text-primary">{overall.pct}%</p>
          </div>
          <Progress value={overall.pct} className="mt-3 h-2.5" />
        </div>

        <ThisWeekPanel
          phases={phases}
          skills={skills}
          items={items}
          weeklyHours={profile?.weekly_hours ?? null}
        />
      </header>


      <div className="relative space-y-10 border-l border-dashed border-border pl-6 md:pl-8">
        {phases.map((phase, index) => (
          <PhaseBlock
            key={phase.id}
            phase={phase}
            index={index}
            skills={skills.filter((skill) => skill.phase_id === phase.id)}
            items={items}
            jobs={(jobs ?? []).filter((job) => job.liked)}
          />
        ))}
      </div>
    </div>
  );
}

function PhaseBlock({
  phase,
  index,
  skills,
  items,
  jobs,
}: {
  phase: RoadmapPhase;
  index: number;
  skills: RoadmapSkill[];
  items: RoadmapItem[];
  jobs: Job[];
}) {
  const phaseItems = items.filter((item) => skills.some((skill) => skill.id === item.skill_id));
  const isApplying = phase.kind === "applying";
  const progress = isApplying
    ? {
        done: jobs.filter((job) => job.application_status !== "not_applied").length,
        total: jobs.length,
        pct: jobs.length
          ? Math.round((jobs.filter((job) => job.application_status !== "not_applied").length / jobs.length) * 100)
          : 0,
      }
    : skillProgress(phaseItems);
  const complete = progress.total > 0 && progress.done === progress.total;

  return (
    <section className="relative">
      <span
        className={cn(
          "absolute -left-[2.35rem] flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors md:-left-[3rem]",
          complete
            ? "border-success bg-success text-success-foreground"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        {complete ? <Check className="size-4" /> : index + 1}
      </span>

      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{phase.name}</h2>
        {complete && (
          <Badge className="animate-pop gap-1 border-0 bg-success text-success-foreground">
            <Trophy className="size-3" /> Phase complete
          </Badge>
        )}
      </div>
      {phase.blurb && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{phase.blurb}</p>}
      {progress.total > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <Progress value={progress.pct} className="h-1.5 max-w-56" />
          <span className="text-xs font-medium text-muted-foreground">
            {progress.done}/{progress.total}
          </span>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {isApplying ? (
          <ApplyingBlock jobs={jobs} />
        ) : (
          skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              items={items.filter((item) => item.skill_id === skill.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SkillCard({ skill, items }: { skill: RoadmapSkill; items: RoadmapItem[] }) {
  const progress = skillProgress(items);
  const ready = progress.total > 0 && progress.done === progress.total;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-warm transition-colors",
        ready ? "border-success/40 bg-success/5" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
        {ready ? (
          <Badge className="animate-pop gap-1 border-0 bg-success text-success-foreground">
            <CheckCircle2 className="size-3" /> Ready
          </Badge>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {progress.done} of {progress.total} done
          </span>
        )}
      </div>
      <Progress value={progress.pct} className="mt-3 h-2" />

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

const ITEM_META: Record<string, { label: string; icon: typeof Target }> = {
  learn: { label: "Learn", icon: Sparkles },
  practice: { label: "Practice", icon: Target },
  certify: { label: "Certify", icon: BadgeCheck },
  build: { label: "Build", icon: Hammer },
  visibility: { label: "Be seen", icon: Megaphone },
};

/** Sources that belong to Microsoft, so they can be visually flagged. */
const MICROSOFT_PROVIDERS = new Set(["Microsoft Learn", "Microsoft", "LinkedIn Learning"]);

function ItemRow({ item }: { item: RoadmapItem }) {
  const done = isItemComplete(item);
  const meta = ITEM_META[item.item_type] ?? ITEM_META["learn"]!;
  const Icon = meta.icon;
  const microsoft = Boolean(item.provider && MICROSOFT_PROVIDERS.has(item.provider));

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        done
          ? "border-success/40 bg-success/10"
          : microsoft
            ? "border-primary/40 border-l-4 border-l-primary bg-primary/5"
            : "border-border bg-secondary/40",
      )}
    >

      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
            done ? "bg-success text-success-foreground" : "bg-card text-primary",
          )}
        >
          {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              {meta.label}
            </span>
            {item.difficulty && (
              <Badge variant="outline" className="h-5 bg-card text-[0.65rem]">
                {item.difficulty}
              </Badge>
            )}
          </div>
          <p className={cn("mt-0.5 font-medium", done && "text-success")}>{item.title}</p>
          {item.provider &&
            (microsoft ? (
              <Badge
                variant="outline"
                className="mt-1 h-5 border-primary/40 bg-primary/10 text-[0.65rem] font-semibold text-primary"
              >
                via {item.provider}
              </Badge>
            ) : (
              <p className="text-xs text-muted-foreground">{item.provider}</p>
            ))}

          {item.detail && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{linkify(item.detail)}</p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Open resource <ExternalLink className="size-3" />
            </a>
          )}
          {item.proof_url && (
            <a
              href={item.proof_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-success hover:underline"
            >
              Your proof <ExternalLink className="size-3" />
            </a>
          )}

          <div className="mt-3">
            <ItemControls item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s·]+)/g).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-primary hover:underline"
      >
        {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
      </a>
    ) : (
      part
    ),
  );
}

function ApplyingBlock({ jobs }: { jobs: Job[] }) {
  const updateJob = useUpdateJob();

  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-warm">
        The roles you liked in chat will show up here to track.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-2xl border border-border bg-card p-5 shadow-warm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{job.title}</p>
              <p className="text-sm text-muted-foreground">
                {job.company} · {job.location}
              </p>
            </div>
            <Select
              value={job.application_status}
              onValueChange={(value) =>
                void updateJob
                  .mutateAsync({ id: job.id, patch: { application_status: value as ApplicationStatus } })
                  .then(() => {
                    if (value === "offer") toast.success("An offer. Look at what you built.");
                    else if (value === "interviewing") toast.success("Interviewing — they want to meet you.");
                    else if (value === "applied") toast.success("Applied. That took nerve.");
                    else if (value === "rejected")
                      toast("Noted — this one's closed.", {
                        description: "One outcome, not a verdict. Your roadmap carries on.",
                      });
                  })
              }
            >
              <SelectTrigger className="w-48 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {job.application_status !== "not_applied" && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <Send className="size-3" /> In motion
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
