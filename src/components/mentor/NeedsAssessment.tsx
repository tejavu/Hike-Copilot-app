import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  GUIDANCE_STYLES,
  MEETING_PREF_LABELS,
  TIME_OF_DAY_LABELS,
  type MeetingPref,
  type MentorPreferences,
  type TimeOfDay,
} from "@/lib/mentors";

export type AssessmentDraft = {
  goal: string;
  target_role: string;
  priority_skills: string[];
  guidance_style: string;
  language: string;
  location_pref: MeetingPref;
  availability_notes: string;
  session_focus: string;
  preferred_time_of_day: TimeOfDay;
  timezone: string;
};

const STEP_COUNT = 6;

const localTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function NeedsAssessment({
  existing,
  inferred,
  languages,
  saving,
  onSubmit,
  onCancel,
}: {
  existing: MentorPreferences | null;
  inferred: { goal: string; targetRole: string; gapSkills: string[]; location: string };
  languages: string[];
  saving: boolean;
  onSubmit: (draft: AssessmentDraft) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AssessmentDraft>(() => ({
    goal: existing?.goal ?? inferred.goal,
    target_role: existing?.target_role ?? inferred.targetRole,
    priority_skills: existing?.priority_skills?.length
      ? existing.priority_skills
      : inferred.gapSkills.slice(0, 3),
    guidance_style: existing?.guidance_style ?? "strategy",
    language:
      existing?.language ??
      (languages.includes("English") ? "English" : (languages[0] ?? "English")),
    location_pref: existing?.location_pref ?? "either",
    availability_notes: existing?.availability_notes ?? "",
    session_focus: existing?.session_focus ?? "",
    preferred_time_of_day: existing?.preferred_time_of_day ?? "any",
    timezone: existing?.timezone ?? localTimezone(),
  }));

  const skillOptions = useMemo(() => {
    const set = new Set([...inferred.gapSkills, ...draft.priority_skills]);
    return [...set];
  }, [inferred.gapSkills, draft.priority_skills]);

  const [customSkill, setCustomSkill] = useState("");

  const set = <K extends keyof AssessmentDraft>(key: K, value: AssessmentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const toggleSkill = (skill: string) =>
    setDraft((current) => ({
      ...current,
      priority_skills: current.priority_skills.includes(skill)
        ? current.priority_skills.filter((item) => item !== skill)
        : [...current.priority_skills, skill],
    }));

  const canAdvance = () => {
    if (step === 0) return draft.goal.trim().length > 2;
    if (step === 1) return draft.target_role.trim().length > 1;
    if (step === 2) return draft.priority_skills.length > 0;
    return true;
  };

  const last = step === STEP_COUNT - 1;

  return (
    <section
      aria-label="Mentor needs assessment"
      className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
        <Sparkles className="size-3.5" /> Step {step + 1} of {STEP_COUNT}
      </div>
      <Progress value={((step + 1) / STEP_COUNT) * 100} className="mt-3 h-1.5" />

      <div className="mt-6 min-h-[15rem] space-y-4">
        {step === 0 && (
          <>
            <h2 className="font-display text-2xl font-semibold">
              Before I introduce you to anyone — what are you actually working toward?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              I've pre-filled what you told me in chat. Change anything that's shifted since.
            </p>
            <Label htmlFor="na-goal" className="sr-only">
              Your goal
            </Label>
            <Textarea
              id="na-goal"
              value={draft.goal}
              onChange={(event) => set("goal", event.target.value)}
              rows={4}
              placeholder="e.g. Move from marketing analytics into a frontend engineering role within a year"
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-display text-2xl font-semibold">Which role are we aiming at?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This is what I match mentors' day jobs against — the closer the title, the more useful
              their instincts will be.
            </p>
            <Label htmlFor="na-role">Target role</Label>
            <Input
              id="na-role"
              value={draft.target_role}
              onChange={(event) => set("target_role", event.target.value)}
              placeholder="e.g. Frontend Engineer"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-2xl font-semibold">
              Which gaps do you most want help with right now?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pulled straight from your roadmap. Pick the two or three that feel heaviest — you can
              add your own too.
            </p>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => {
                const active = draft.priority_skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    {skill}
                  </button>
                );
              })}
              {skillOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No roadmap skills found yet — add what you want help with below.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
                placeholder="Add another skill or topic"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && customSkill.trim()) {
                    event.preventDefault();
                    toggleSkill(customSkill.trim());
                    setCustomSkill("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!customSkill.trim()) return;
                  toggleSkill(customSkill.trim());
                  setCustomSkill("");
                }}
              >
                Add
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-2xl font-semibold">
              What kind of guidance helps you most?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              There's no wrong answer — mentors are good at different things.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GUIDANCE_STYLES.map((option) => {
                const active = draft.guidance_style === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("guidance_style", option.value)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-colors",
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {option.label}
                      {active && <Check className="size-3.5 text-primary" />}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-display text-2xl font-semibold">
              Language and how you'd like to meet
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="na-language">Language you want to be mentored in</Label>
                <Select value={draft.language} onValueChange={(value) => set("language", value)}>
                  <SelectTrigger id="na-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="na-format">Remote or in person</Label>
                <Select
                  value={draft.location_pref}
                  onValueChange={(value) => set("location_pref", value as MeetingPref)}
                >
                  <SelectTrigger id="na-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["either", "remote", "in_person"] as MeetingPref[]).map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {MEETING_PREF_LABELS[pref]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="na-availability">When are you realistically free?</Label>
              <Input
                id="na-availability"
                value={draft.availability_notes}
                onChange={(event) => set("availability_notes", event.target.value)}
                placeholder="e.g. Weekday evenings after 18:00, or Saturday mornings"
              />
              {inferred.location && (
                <p className="text-xs text-muted-foreground">
                  I'll use your saved location ({inferred.location}) to work out who's actually
                  nearby.
                </p>
              )}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="font-display text-2xl font-semibold">
              And if you only got one hour with her — what would you want from it?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This becomes the theme of your first session and shapes the questions I prepare for
              you.
            </p>
            <Label htmlFor="na-focus" className="sr-only">
              Session focus
            </Label>
            <Textarea
              id="na-focus"
              value={draft.session_focus}
              onChange={(event) => set("session_focus", event.target.value)}
              rows={4}
              placeholder="e.g. An honest read on whether my portfolio is good enough to start applying"
            />
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
          disabled={step === 0 && !onCancel}
        >
          <ArrowLeft className="size-4" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {last ? (
          <Button type="button" className="gap-2" disabled={saving} onClick={() => onSubmit(draft)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Find my matches
          </Button>
        ) : (
          <Button
            type="button"
            className="gap-2"
            disabled={!canAdvance()}
            onClick={() => setStep(step + 1)}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </section>
  );
}
