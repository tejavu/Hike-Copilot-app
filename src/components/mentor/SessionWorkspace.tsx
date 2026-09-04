import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Check,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MentorAvatar } from "@/components/mentor/MentorCard";
import {
  useAddActions,
  useSavePreferences,
  useToggleAction,
  useUpdateSession,
} from "@/hooks/useMentorData";
import { generateMentorPrep } from "@/lib/mentors.functions";
import {
  buildSessionIcs,
  downloadIcsFile,
  fallbackPrep,
  formatSlot,
  nextCheckInFrom,
  relativeDays,
  upcomingSlots,
  type Mentor,
  type MentorAction,
  type MentorSession,
  type PrepContext,
} from "@/lib/mentors";

type PrepInputs = Omit<PrepContext, "mentor">;

export function UpcomingSessionCard({
  session,
  mentor,
  prep,
  roadmapSkills,
  onCancelled,
}: {
  session: MentorSession;
  mentor: Mentor;
  prep: PrepInputs;
  roadmapSkills: { id: string; name: string }[];
  onCancelled?: () => void;
}) {
  const update = useUpdateSession();
  const [questions, setQuestions] = useState<string[]>(session.prep_questions);
  const [agenda, setAgenda] = useState(session.agenda ?? "");
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    setQuestions(session.prep_questions);
    setAgenda(session.agenda ?? "");
  }, [session.id, session.prep_questions, session.agenda]);

  const slots = useMemo(() => upcomingSlots(mentor), [mentor]);
  const hasPrep = questions.length > 0;

  const buildPrep = async () => {
    setLoadingPrep(true);
    try {
      const result = await generateMentorPrep({
        data: {
          mentorName: mentor.full_name,
          mentorTitle: `${mentor.title} at ${mentor.company}`,
          mentorExpertise: mentor.expertise,
          goal: prep.goal ?? "",
          targetRole: prep.targetRole ?? "",
          prioritySkills: prep.prioritySkills,
          builds: prep.builds,
          certifications: prep.certifications,
          eventTakeaways: prep.eventTakeaways,
          sessionFocus: prep.sessionFocus ?? session.theme,
        },
      });

      const next = result.ok
        ? { agenda: result.agenda, questions: result.questions }
        : fallbackPrep({ mentor, ...prep, sessionFocus: prep.sessionFocus ?? session.theme });

      setQuestions(next.questions);
      setAgenda(next.agenda);
      await update.mutateAsync({
        id: session.id,
        patch: { agenda: next.agenda, prep_questions: next.questions },
      });

      if (result.ok) toast.success("Prepped. Edit anything that doesn't sound like you.");
      else if (result.reason === "no_credits") {
        toast.info("Used my built-in prep", {
          description:
            "AI credits are unavailable right now, so I wrote these from your roadmap instead.",
        });
      } else {
        toast.info("Used my built-in prep", {
          description:
            "I couldn't reach the AI just now, so these come straight from your roadmap.",
        });
      }
    } catch {
      toast.error("Prep didn't generate. Try again?");
    } finally {
      setLoadingPrep(false);
    }
  };

  const savePrep = () =>
    update.mutate(
      { id: session.id, patch: { agenda, prep_questions: questions.filter((q) => q.trim()) } },
      { onSuccess: () => toast.success("Saved your version.") },
    );

  const prepText = [
    `Session with ${mentor.full_name} — ${formatSlot(session.starts_at)}`,
    session.theme ? `Focus: ${session.theme}` : "",
    "",
    agenda,
    "",
    "Questions:",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MentorAvatar name={mentor.full_name} />
          <div>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Next session
            </p>
            <h3 className="font-display text-xl font-semibold">{mentor.full_name}</h3>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatSlot(session.starts_at)} · {relativeDays(session.starts_at)}
            </p>
            {session.theme && <p className="mt-1 text-sm">{session.theme}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              downloadIcsFile(buildSessionIcs(session, mentor), "ada-mentoring-session.ics");
              toast.success("Calendar file downloaded.");
            }}
          >
            <CalendarPlus className="size-3.5" />
            Add to calendar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setRescheduling((value) => !value)}
          >
            <RefreshCw className="size-3.5" />
            Reschedule
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() =>
              update.mutate(
                { id: session.id, patch: { status: "cancelled" } },
                {
                  onSuccess: () => {
                    // Cancelling pauses new mentor requests for a while, so a
                    // volunteer's time isn't held and dropped repeatedly.
                    savePreferences.mutate({ cooldown_until: cooldownEndsAt() });
                    toast.success("Cancelled.", {
                      description: `No guilt. You can request a new mentor again after ${new Date(cooldownEndsAt()).toLocaleDateString(undefined, { day: "numeric", month: "long" })}.`,
                    });
                    onCancelled?.();
                  },
                },
              )
            }
          >
            <X className="size-3.5" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-accent/40 p-3 text-xs leading-relaxed text-accent-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Video className="size-3.5" /> Meeting link
        </span>
        <p className="mt-1">
          Microsoft Teams isn't connected, so no Teams meeting was created automatically. Add the
          .ics to your calendar and paste the link your mentor sends into that entry.
        </p>
      </div>

      {rescheduling && (
        <div className="mt-4 rounded-2xl border border-border p-4">
          <p className="text-sm font-medium">Move it to one of her other openings</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No other openings in the next few weeks.
              </p>
            )}
            {slots.map((slot) => (
              <Button
                key={slot.start.toISOString()}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() =>
                  update.mutate(
                    {
                      id: session.id,
                      patch: {
                        starts_at: slot.start.toISOString(),
                        ends_at: slot.end.toISOString(),
                      },
                    },
                    {
                      onSuccess: () => {
                        toast.success(`Moved to ${formatSlot(slot.start)}.`);
                        setRescheduling(false);
                      },
                    },
                  )
                }
              >
                {formatSlot(slot.start)} · {slot.minutes} min
              </Button>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-5" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="size-4 text-primary" />
            Questions worth her hour
          </h4>
          <p className="text-sm text-muted-foreground">
            Built from your goal, roadmap gaps, what you've built and your event notes.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={loadingPrep}
          onClick={() => void buildPrep()}
        >
          {loadingPrep ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {hasPrep ? "Regenerate" : "Prepare me"}
        </Button>
      </div>

      {hasPrep ? (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`agenda-${session.id}`}>Agenda</Label>
            <Textarea
              id={`agenda-${session.id}`}
              value={agenda}
              onChange={(event) => setAgenda(event.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Questions</Label>
            {questions.map((question, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={question}
                  rows={2}
                  aria-label={`Question ${index + 1}`}
                  onChange={(event) =>
                    setQuestions((current) =>
                      current.map((item, i) => (i === index ? event.target.value : item)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove question ${index + 1}`}
                  onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuestions((current) => [...current, ""])}
            >
              Add my own question
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" disabled={update.isPending} onClick={savePrep}>
              {update.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Save my version
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                void navigator.clipboard.writeText(prepText);
                toast.success("Copied — paste it wherever you take notes.");
              }}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                const blob = new Blob([prepText], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "mentor-session-prep.txt";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
          Nothing prepared yet. Hit "Prepare me" and I'll write you an agenda and six specific
          questions — then edit them until they sound like you.
        </p>
      )}

      <Separator className="my-5" />

      <Button
        variant="secondary"
        className="gap-1.5"
        onClick={() =>
          update.mutate(
            { id: session.id, patch: { status: "completed" } },
            { onSuccess: () => toast.success("Marked done. Let's capture what she said.") },
          )
        }
      >
        <FileText className="size-4" />
        We had the session — log it
      </Button>
    </section>
  );
}

/* ------------------------------- follow-up -------------------------------- */

export function FollowUpCard({
  session,
  mentor,
  roadmapSkills,
  onSaved,
}: {
  session: MentorSession;
  mentor: Mentor;
  roadmapSkills: { id: string; name: string }[];
  onSaved?: (nextCheckIn: string | null) => void;
}) {
  const update = useUpdateSession();
  const addActions = useAddActions();
  const [recap, setRecap] = useState(session.recap ?? "");
  const [advice, setAdvice] = useState(session.key_advice ?? "");
  const [source, setSource] = useState(session.recap_source);
  const [actions, setActions] = useState<{ title: string; due: string; skillId: string }[]>([
    { title: "", due: "", skillId: "none" },
  ]);
  const [checkIn, setCheckIn] = useState(
    (session.next_check_in_at ?? nextCheckInFrom(new Date(), "monthly") ?? "").slice(0, 10),
  );

  const save = async () => {
    await update.mutateAsync({
      id: session.id,
      patch: {
        recap: recap.trim() || null,
        key_advice: advice.trim() || null,
        recap_source: source,
        status: "completed",
        next_check_in_at: checkIn ? new Date(`${checkIn}T09:00:00`).toISOString() : null,
      },
    });

    const cleaned = actions.filter((action) => action.title.trim());
    if (cleaned.length) {
      await addActions.mutateAsync(
        cleaned.map((action) => ({
          sessionId: session.id,
          mentorId: mentor.id,
          title: action.title.trim(),
          dueDate: action.due || null,
          roadmapSkillId: action.skillId === "none" ? null : action.skillId,
          mentorName: mentor.full_name,
        })),
      );
    }
    setActions([{ title: "", due: "", skillId: "none" }]);
    toast.success("Logged. That's how a mentoring relationship actually compounds.");
    onSaved?.(checkIn ? new Date(`${checkIn}T09:00:00`).toISOString() : null);
  };

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <MentorAvatar name={mentor.full_name} />
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">Follow-up</p>
          <h3 className="font-display text-xl font-semibold">
            What came out of {formatSlot(session.starts_at)}?
          </h3>
          <p className="text-sm text-muted-foreground">
            Write it while it's fresh. Future you will read this before the next session.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`recap-source-${session.id}`}>Where's this recap from?</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger id={`recap-source-${session.id}`} className="sm:w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">My own notes</SelectItem>
              <SelectItem value="teams_recap">Pasted from Teams Intelligent Recap</SelectItem>
            </SelectContent>
          </Select>
          {source === "teams_recap" && (
            <p className="rounded-2xl bg-accent/40 p-3 text-xs leading-relaxed text-accent-foreground">
              Teams Premium's Intelligent Recap can generate a summary and action items — but only
              when the meeting organiser's Microsoft 365 tenant has it enabled, and only inside
              Teams. Hike Copilot can't join, record or read your calls. If you have a recap, copy it from
              Teams and paste it below.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`recap-${session.id}`}>Recap</Label>
          <Textarea
            id={`recap-${session.id}`}
            value={recap}
            onChange={(event) => setRecap(event.target.value)}
            rows={5}
            placeholder="What did you talk about? What surprised you?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`advice-${session.id}`}>The advice worth keeping</Label>
          <Textarea
            id={`advice-${session.id}`}
            value={advice}
            onChange={(event) => setAdvice(event.target.value)}
            rows={3}
            placeholder="The one or two things she said that you don't want to forget"
          />
        </div>

        <div className="space-y-2">
          <Label>Action plan</Label>
          <p className="text-xs text-muted-foreground">
            Each item becomes a trackable task. Link one to a roadmap skill and I'll add it there as
            committed work — never as proof you've mastered it.
          </p>
          {actions.map((action, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_9rem_11rem]">
              <Input
                value={action.title}
                aria-label={`Action ${index + 1}`}
                placeholder="e.g. Rewrite my project README with results"
                onChange={(event) =>
                  setActions((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
              />
              <Input
                type="date"
                value={action.due}
                aria-label={`Due date for action ${index + 1}`}
                onChange={(event) =>
                  setActions((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, due: event.target.value } : item,
                    ),
                  )
                }
              />
              <Select
                value={action.skillId}
                onValueChange={(value) =>
                  setActions((current) =>
                    current.map((item, i) => (i === index ? { ...item, skillId: value } : item)),
                  )
                }
              >
                <SelectTrigger aria-label={`Roadmap skill for action ${index + 1}`}>
                  <SelectValue placeholder="Roadmap link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No roadmap link</SelectItem>
                  {roadmapSkills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setActions((current) => [...current, { title: "", due: "", skillId: "none" }])
            }
          >
            Add another action
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`checkin-${session.id}`}>Next check-in</Label>
          <Input
            id={`checkin-${session.id}`}
            type="date"
            className="sm:w-56"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </div>

        <Button
          className="gap-1.5"
          disabled={update.isPending || addActions.isPending}
          onClick={() => void save()}
        >
          {update.isPending || addActions.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Save follow-up
        </Button>
      </div>
    </section>
  );
}

/* -------------------------------- progress -------------------------------- */

export function ActionPlanList({
  actions,
  mentorName,
}: {
  actions: MentorAction[];
  mentorName: string;
}) {
  const toggle = useToggleAction();
  const done = actions.filter((action) => action.done).length;
  const pct = actions.length === 0 ? 0 : Math.round((done / actions.length) * 100);

  if (actions.length === 0) {
    return (
      <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
        No action items yet. After your first session with {mentorName.split(" ")[0]}, whatever you
        agree on lands here as trackable tasks.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {done} of {actions.length} done
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <ul className="space-y-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="flex items-start gap-3 rounded-2xl border border-border bg-background p-3"
          >
            <button
              type="button"
              aria-pressed={action.done}
              aria-label={
                action.done
                  ? `Mark "${action.title}" as not done`
                  : `Mark "${action.title}" as done`
              }
              onClick={() => toggle.mutate(action)}
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                action.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {action.done && <Check className="size-3" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${action.done ? "text-muted-foreground line-through" : ""}`}>
                {action.title}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {action.due_date && (
                  <Badge variant="outline" className="font-normal">
                    due {new Date(action.due_date).toLocaleDateString()}
                  </Badge>
                )}
                {action.roadmap_item_id && (
                  <Badge variant="secondary" className="font-normal">
                    on your roadmap
                  </Badge>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
