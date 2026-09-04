import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileUp,
  Heart,
  Loader2,
  PartyPopper,
  Pencil,
  Plus,
  Sparkle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useJobs, useProfile, useUpdateJob, useUpdateProfile } from "@/hooks/useCoachData";
import { parseCvDocuments } from "@/lib/cv-parse.functions";
import { normaliseAnswer } from "@/lib/profile-parse.functions";
import { writeRoadmapCopy } from "@/lib/roadmap-copy.functions";
import { CH_LOCATION_OPTIONS, deriveTargetLevel, skillGap, type TargetLevel } from "@/lib/job-sweep";
import { searchJobs } from "@/lib/job-search.functions";
import { generateRoadmap, phasePlanFor } from "@/lib/roadmap-builder";
import { confidentSkills, readDocumentFile, WEEKLY_OPTIONS, type WeeklyOption } from "@/lib/onboarding";
import type { Job, Profile, SkillConfidence } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";


type StepId =
  | "documents"
  | "drawn_to"
  | "constraints"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "review"
  | "jobs"
  | "commitment"
  | "done";

const SETUPS = ["Remote", "Hybrid", "On-site"];

const LEVEL_CHOICES: { value: TargetLevel; label: string }[] = [
  { value: "junior", label: "Just starting out" },
  { value: "mid", label: "A few years in" },
  { value: "senior", label: "Experienced / senior" },
];

const DRAWN_TO_HINTS = [
  "Building things people use",
  "Working with data",
  "Making systems reliable",
  "Helping people directly",
  "Design and how things feel",
  "Security and risk",
];

type Draft = {
  drawnTo: string;
  locations: string[];
  setups: string[];
  workAuth: string;
  recentRole: string;
  skills: SkillConfidence[];
  education: string;
  certifications: string;
  projects: string;
  weeklyHours: number;
  months: number;
  goal: string;
  /** Only set when we couldn't work her level out and had to ask. */
  targetLevel: TargetLevel | null;
};

function draftFromProfile(profile: Profile): Draft {
  return {
    drawnTo: profile.drawn_to ?? "",
    locations: (profile.location_pref ?? "")
      .split(" · ")
      .map((part) => part.trim())
      .filter(Boolean),

    setups: profile.work_setup ?? [],
    workAuth: profile.work_auth ?? "",
    recentRole: profile.recent_role ?? profile.experience.map((e) => e.title).join("\n"),
    skills:
      profile.skill_confidence?.length
        ? profile.skill_confidence
        : profile.skills.map((name) => ({ name, level: 3 })),
    education: profile.education.map((e) => e.title).join("\n"),
    certifications: profile.certifications.join("\n"),
    projects: (profile.projects ?? []).map((p) => p.title).join("\n"),
    weeklyHours: profile.weekly_hours ?? 6,
    months: profile.timeline_months ?? 6,
    goal: profile.goal ?? "",
    targetLevel: null,
  };
}


export function OnboardingForm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: jobs } = useJobs();
  const updateProfile = useUpdateProfile();
  const updateJob = useUpdateJob();
  const readDocuments = useServerFn(parseCvDocuments);
  const cleanAnswer = useServerFn(normaliseAnswer);
  const roadmapCopy = useServerFn(writeRoadmapCopy);
  const findJobs = useServerFn(searchJobs);

  const [step, setStep] = useState<StepId>("documents");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [cvSummary, setCvSummary] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const form = draft ?? (profile ? draftFromProfile(profile) : null);
  const patch = (next: Partial<Draft>) => form && setDraft({ ...form, ...next });

  const order: StepId[] = ["documents", "drawn_to", "constraints", "experience", "skills", "education", "projects", "review"];
  const stepIndex = order.indexOf(step);
  const totalSteps = order.length + 2;
  const progress = Math.round(((step === "jobs" ? order.length : step === "commitment" ? order.length + 1 : step === "done" ? totalSteps : stepIndex) / totalSteps) * 100);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    void qc.invalidateQueries({ queryKey: ["jobs", user?.id] });
    void qc.invalidateQueries({ queryKey: ["documents", user?.id] });
    void qc.invalidateQueries({ queryKey: ["roadmap", user?.id] });
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setBusyLabel(label);
    try {
      await fn();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  // ---------- CV upload ----------
  const handleFiles = async (picked: File[]) => {
    if (!form || picked.length === 0) return;
    await run("Reading your documents", async () => {
      const payload = [];
      const stored: string[] = [];
      for (const file of picked.slice(0, 5)) {
        if (file.size > 15_000_000) {
          toast.error(`${file.name} is larger than 15 MB — try a smaller export.`);
          continue;
        }
        const read = await readDocumentFile(file);
        if (read.unsupported) {
          toast.error(`I can't open ${file.name} yet. PDF, image or text works best.`);
          continue;
        }
        const path = `${user!.id}/docs/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("user-files").upload(path, file);
        if (uploadError) {
          console.error("storage upload failed", uploadError);
          toast.error(`Couldn't save ${file.name}, but I'll still read it.`);
        } else {
          await supabase
            .from("user_documents")
            .insert({ user_id: user!.id, kind: "document", file_name: file.name, storage_path: path } as never);
        }
        stored.push(file.name);
        payload.push(read.payload);
      }

      if (payload.length === 0) return;

      const { parsed, error } = await readDocuments({ data: { files: payload } });
      if (error) {
        toast.error(error);
        setCvSummary(null);
        setStep("drawn_to");
        refresh();
        return;
      }

      const skills: SkillConfidence[] = parsed.skills.map((name: string) => ({ name, level: 3 }));
      setDraft({
        ...form,
        drawnTo: form.drawnTo || parsed.interests.join(", "),
        recentRole:
          form.recentRole || parsed.experience.map((e: { title: string }) => e.title).join("\n"),
        skills: skills.length ? skills : form.skills,
        education: form.education || parsed.education.map((e: { title: string }) => e.title).join("\n"),
        certifications: form.certifications || parsed.certifications.join("\n"),
        projects: form.projects || (parsed.projects ?? []).map((p: { title: string }) => p.title).join("\n"),
      });
      if (parsed.full_name && !profile?.full_name) {
        await updateProfile.mutateAsync({ full_name: parsed.full_name });
      }
      setCvSummary(
        parsed.summary ??
          `Read ${stored.join(", ")} — I've filled in what I could find. Check it over below.`,
      );
      toast.success("Documents read");
      setStep("drawn_to");
      refresh();
    });
  };

  // ---------- skills ----------
  const addSkill = async () => {
    const text = newSkill.trim();
    if (!text || !form) return;
    setNewSkill("");
    let names = [text];
    try {
      const { items } = await cleanAnswer({ data: { field: "skills", text } });
      if (items?.length) names = items;
    } catch (error) {
      console.error("skill clean failed", error);
    }
    const existing = new Set(form.skills.map((s) => s.name.toLowerCase()));
    const added = names
      .filter((name) => !existing.has(name.toLowerCase()))
      .map((name) => ({ name, level: 3 }));
    patch({ skills: [...form.skills, ...added] });
  };

  // ---------- save + job sweep ----------
  const saveAndSweep = async () => {
    if (!form || !profile) return;
    await run("Looking for roles that fit", async () => {
      const [interests, education, certifications, projects] = await Promise.all([
        clean("interests", form.drawnTo),
        clean("education", form.education),
        clean("certifications", form.certifications),
        clean("projects", form.projects),
      ]);
      const experience = form.recentRole
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const nextPatch: Partial<Profile> = {
        drawn_to: form.drawnTo,
        interests,
        location_pref: form.locations.join(" · "),
        work_setup: form.setups,
        work_auth: form.workAuth,
        recent_role: form.recentRole,
        skills: form.skills.map((s) => s.name),
        skill_confidence: form.skills,
        education: education.map((title) => ({ title })),
        experience: experience.map((title) => ({ title })),
        certifications,
        projects: projects.map((title) => ({ title })),
        onboarding_stage: "jobs",
      };
      await updateProfile.mutateAsync(nextPatch);

      const merged: Profile = { ...profile, ...nextPatch } as Profile;
      await supabase.from("jobs").delete().eq("user_id", profile.id);
      // Live search against the skills she actually listed, with her own
      // confidence levels doing the weighting.
      const result = await findJobs({
        data: {
          skills: form.skills,
          interests,
          drawnTo: form.drawnTo,
          locations: form.locations,
          setups: form.setups,
          recentRole: form.recentRole,
          targetLevel: form.targetLevel,
          count: 10,
        },
      });
      if (result.jobs.length === 0) {
        toast.error("I couldn't find openings for that profile yet", {
          description: result.notes[0] ?? "Try adding a location or another skill.",
        });
      } else if (result.examplesOnly) {
        toast.info("No live postings matched yet — these are example roles", {
          description: "They show the shape of roles that fit you while I keep looking.",
        });
      }

      const { error } = await supabase
        .from("jobs")
        .insert(result.jobs.map((job) => ({ ...job, user_id: merged.id })) as never);
      if (error) throw error;
      setStep("jobs");
      refresh();
    });
  };

  const clean = async (
    field: "interests" | "skills" | "education" | "experience" | "certifications" | "projects",
    text: string,
  ): Promise<string[]> => {
    if (!text.trim()) return [];
    try {
      const { items } = await cleanAnswer({ data: { field, text } });
      if (items) return items;
    } catch (error) {
      console.error("normalise failed", error);
    }
    return text
      .split(/[\n,;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 1);
  };

  const decideJob = async (job: Job, liked: boolean) => {
    await updateJob.mutateAsync({ id: job.id, patch: { liked } });
  };

  const likedJobs = (jobs ?? []).filter((j) => j.liked);
  const undecided = (jobs ?? []).filter((j) => j.liked === null);

  const gapPreview = useMemo(() => {
    if (!form) return { strengths: [], gaps: [] };
    return skillGap(confidentSkills(form.skills), likedJobs.flatMap((j) => j.required_skills));
  }, [form, jobs]);

  const buildRoadmap = async () => {
    if (!form || !profile) return;
    await run("Building your roadmap", async () => {
      const gaps = gapPreview.gaps;
      const timeline = `${form.months} month${form.months === 1 ? "" : "s"}, about ${form.weeklyHours}h a week`;
      let copy = null;
      try {
        const result = await roadmapCopy({
          data: {
            goal: form.goal,
            months: form.months,
            gaps: gaps.slice(0, 6),
            roles: likedJobs.map((j) => `${j.title} at ${j.company}`).slice(0, 8),
            phases: phasePlanFor(form.months).map((p) => ({ kind: p.kind, name: p.name, blurb: p.blurb })),
          },
        });
        copy = result.copy;
      } catch (error) {
        console.error("roadmap copy failed", error);
      }

      await generateRoadmap({ userId: profile.id, gaps, months: form.months, copy });
      await updateProfile.mutateAsync({
        goal: form.goal,
        timeline,
        timeline_months: form.months,
        weekly_hours: form.weeklyHours,
        onboarding_stage: "done",
        onboarding_complete: true,
        roadmap_generated: true,
      });
      setStep("done");
      refresh();
    });
  };

  if (!form) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Let's get to know you</p>
        <h1 className="font-display mt-1.5 text-2xl font-semibold">
          {step === "done" ? "Your plan is ready" : "A few questions, then a real plan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing here is a test. Answer roughly and come back to edit any of it — you can always go back a step.
        </p>
        <Progress value={progress} className="mt-5 h-2" />
      </header>

      {busy && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-warm">
          <Loader2 className="size-4 animate-spin text-primary" /> {busyLabel || "Working on it"}…
        </div>
      )}

      {cvSummary && step !== "done" && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-primary">
            <Sparkle className="size-4" /> From your documents
          </p>
          <p className="mt-1.5 text-muted-foreground">{cvSummary}</p>
        </div>
      )}

      {step === "documents" && (
        <Card>
          <CardTitle>Have a CV handy?</CardTitle>
          <CardHint>
            Upload it and I'll pre-fill your experience, skills and education so you only have to correct me. PDF,
            image or plain text — Word files need exporting to PDF first.
          </CardHint>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              className="gap-2"
            >
              <FileUp className="size-4" /> Choose files
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setStep("drawn_to")}>
              I'll type it in instead
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (picked.length) void handleFiles(picked);
              }}
            />
          </div>
        </Card>
      )}

      {step === "drawn_to" && (
        <Card>
          <CardTitle>What kind of work or problems do you find yourself drawn to?</CardTitle>
          <CardHint>
            No job titles needed — "building things", "working with data", "helping people directly" is exactly the
            right level. This is what I go looking for roles with.
          </CardHint>
          <Textarea
            value={form.drawnTo}
            onChange={(e) => patch({ drawnTo: e.target.value })}
            rows={4}
            className="mt-4"
            placeholder="I like figuring out why something's broken and making it smoother for the people using it…"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {DRAWN_TO_HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() =>
                  patch({ drawnTo: form.drawnTo ? `${form.drawnTo.replace(/[\s,]+$/, "")}, ${hint}` : hint })
                }
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary"
              >
                + {hint}
              </button>
            ))}
          </div>
          <Nav
            onBack={() => setStep("documents")}
            onNext={() => setStep("constraints")}
            nextDisabled={form.drawnTo.trim().length < 3}
          />
        </Card>
      )}

      {step === "constraints" && (
        <Card>
          <CardTitle>Any constraints on location or work setup?</CardTitle>
          <CardHint>This decides which of the roles I find are actually viable for you.</CardHint>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs font-semibold tracking-wide uppercase">Work setup</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SETUPS.map((setup) => {
                  const on = form.setups.includes(setup);
                  return (
                    <button
                      key={setup}
                      type="button"
                      onClick={() =>
                        patch({
                          setups: on ? form.setups.filter((s) => s !== setup) : [...form.setups, setup],
                        })
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      {on && <Check className="mr-1.5 inline size-3.5" />}
                      {setup}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wide uppercase">
                Where are you based / willing to work?
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick as many as you'd genuinely consider — I'll only show roles in those places.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="mt-2 w-full justify-between font-normal">
                    <span className="truncate">
                      {form.locations.length
                        ? form.locations.join(" · ")
                        : "Choose one or more locations"}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
                  {CH_LOCATION_OPTIONS.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option}
                      checked={form.locations.includes(option)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={(checked) =>
                        patch({
                          locations: checked
                            ? [...form.locations, option]
                            : form.locations.filter((l) => l !== option),
                        })
                      }
                    >
                      {option}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {form.locations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.locations.map((loc) => (
                    <Badge key={loc} variant="outline" className="gap-1 bg-secondary/60">
                      {loc}
                      <button
                        type="button"
                        aria-label={`Remove ${loc}`}
                        onClick={() => patch({ locations: form.locations.filter((l) => l !== loc) })}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="auth" className="text-xs font-semibold tracking-wide uppercase">
                Work authorisation, if it matters
              </Label>
              <Input
                id="auth"
                value={form.workAuth}
                onChange={(e) => patch({ workAuth: e.target.value })}
                placeholder="Swiss B permit · EU citizen · would need sponsorship"
                className="mt-2"
              />
            </div>
          </div>
          <Nav onBack={() => setStep("drawn_to")} onNext={() => setStep("experience")} />
        </Card>
      )}

      {step === "experience" && (
        <Card>
          <CardTitle>What's your most recent role, or closest experience?</CardTitle>
          <CardHint>
            One line each is plenty. "I'm starting fresh" is a completely fine answer — it just tells me where to
            begin.
          </CardHint>
          <Textarea
            value={form.recentRole}
            onChange={(e) => patch({ recentRole: e.target.value })}
            rows={4}
            className="mt-4"
            placeholder="Support Analyst — Alpine Insurance (2023–now)"
          />
          <Nav onBack={() => setStep("constraints")} onNext={() => setStep("skills")} />
        </Card>
      )}

      {step === "skills" && (
        <Card>
          <CardTitle>What can you already do — and how confident do you feel?</CardTitle>
          <CardHint>
            Confidence matters more than a yes/no. Anything you rate 1 or 2 I'll treat as still growing, so it lands
            in your roadmap.
          </CardHint>
          <div className="mt-4 flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addSkill();
                }
              }}
              placeholder="Python, a bit of SQL, React…"
            />
            <Button variant="outline" onClick={() => void addSkill()} className="shrink-0 gap-1.5">
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            {form.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing listed yet — add whatever comes to mind, half-learned counts.
              </p>
            )}
            {form.skills.map((skill, index) => (
              <div key={`${skill.name}-${index}`} className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{skill.name}</p>
                  <button
                    type="button"
                    aria-label={`Remove ${skill.name}`}
                    onClick={() => patch({ skills: form.skills.filter((_, i) => i !== index) })}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Slider
                    value={[skill.level]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={([level]) =>
                      patch({
                        skills: form.skills.map((s, i) => (i === index ? { ...s, level: level ?? 3 } : s)),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="w-32 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {["just curious", "learning", "can use it", "comfortable", "could teach it"][skill.level - 1]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Nav onBack={() => setStep("experience")} onNext={() => setStep("education")} />
        </Card>
      )}

      {step === "education" && (
        <Card>
          <CardTitle>Education, certifications or courses worth mentioning?</CardTitle>
          <CardHint>Bootcamps, self-taught courses and half-finished things all count.</CardHint>
          <Label className="mt-4 block text-xs font-semibold tracking-wide uppercase">Education</Label>
          <Textarea
            value={form.education}
            onChange={(e) => patch({ education: e.target.value })}
            rows={3}
            className="mt-2"
            placeholder="BSc Business Administration — University of Bern (2021)"
          />
          <Label className="mt-4 block text-xs font-semibold tracking-wide uppercase">
            Certifications & courses
          </Label>
          <Textarea
            value={form.certifications}
            onChange={(e) => patch({ certifications: e.target.value })}
            rows={3}
            className="mt-2"
            placeholder="Google Data Analytics Certificate · CS50"
          />
          <Nav onBack={() => setStep("skills")} onNext={() => setStep("projects")} />
        </Card>
      )}

      {step === "projects" && (
        <Card>
          <CardTitle>Any projects you'd like to show off?</CardTitle>
          <CardHint>
            Side projects, coursework, volunteering builds — one line each. Add a link if there is one. Leave it
            empty if you'd rather not.
          </CardHint>
          <Textarea
            value={form.projects}
            onChange={(e) => patch({ projects: e.target.value })}
            rows={4}
            className="mt-4"
            placeholder={"Budget tracker app — React + Supabase, used by 40 people (2024)"}
          />
          <Nav onBack={() => setStep("education")} onNext={() => setStep("review")} />
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardTitle>Does this look like you?</CardTitle>
          <CardHint>Edit anything that's off, then I'll go looking for roles.</CardHint>
          <div className="mt-4 divide-y divide-border">
            <ReviewRow label="Drawn to" value={form.drawnTo} onEdit={() => setStep("drawn_to")} />
            <ReviewRow
              label="Location & setup"
              value={[form.setups.join(", "), form.locations.join(" · "), form.workAuth].filter(Boolean).join(" · ")}
              onEdit={() => setStep("constraints")}
            />
            <ReviewRow label="Experience" value={form.recentRole} onEdit={() => setStep("experience")} />
            <ReviewRow
              label="Skills"
              value={form.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ")}
              onEdit={() => setStep("skills")}
            />
            <ReviewRow
              label="Education & certificates"
              value={[form.education, form.certifications].filter(Boolean).join(" · ")}
              onEdit={() => setStep("education")}
            />
            <ReviewRow label="Projects" value={form.projects} onEdit={() => setStep("projects")} />
          </div>
          {needsLevelAnswer && (
            <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
              <Label className="text-xs font-semibold tracking-wide uppercase">
                One last thing — what stage are you at?
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                I couldn't tell from your answers, and it changes which roles I show you.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LEVEL_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() => patch({ targetLevel: choice.value })}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      form.targetLevel === choice.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("projects")} className="gap-1.5">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              disabled={busy || (needsLevelAnswer && !form.targetLevel)}
              onClick={() => void saveAndSweep()}
              className="gap-2"
            >
              Find roles for me <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === "jobs" && (
        <div className="space-y-4">
          <Card>
            <CardTitle>Roles that fit the direction you're pointing in</CardTitle>
            <CardHint>
              Keep the ones that make you a little bit excited — especially the ones that feel like a stretch. Your
              roadmap gets built around these.
            </CardHint>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {likedJobs.length} kept · {undecided.length} still to look at
            </p>
          </Card>
          {undecided[0] ? (
            <JobCard job={undecided[0]} busy={busy} onDecide={decideJob} />
          ) : (
            <Card>
              {likedJobs.length === 0 ? (
                <>
                  <CardTitle>None of those landed</CardTitle>
                  <CardHint>
                    That's information, not a failure. Tweak what you're drawn to and I'll go looking again.
                  </CardHint>
                  <div className="mt-5 flex gap-2">
                    <Button variant="outline" onClick={() => setStep("drawn_to")}>
                      Change my answers
                    </Button>
                    <Button disabled={busy} onClick={() => void saveAndSweep()}>
                      Search again
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <CardTitle>Here's the honest picture — and it's a good one</CardTitle>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
                      <p className="text-xs font-semibold tracking-wide text-success uppercase">Already yours</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {gapPreview.strengths.length ? (
                          gapPreview.strengths.map((skill) => (
                            <Badge key={skill} className="border-0 bg-success text-success-foreground">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Starting fresh — a perfectly good place to start.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                      <p className="text-xs font-semibold tracking-wide text-primary uppercase">Next to grow</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {gapPreview.gaps.map((skill) => (
                          <Badge key={skill} variant="outline" className="border-primary/40 bg-card text-foreground">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <Button variant="ghost" onClick={() => setStep("review")} className="gap-1.5">
                      <ArrowLeft className="size-4" /> Back to my answers
                    </Button>
                    <Button onClick={() => setStep("commitment")} className="gap-2">
                      Next <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      )}

      {step === "commitment" && (
        <Card>
          <CardTitle>How much time can you realistically commit each week?</CardTitle>
          <CardHint>
            Be honest rather than ambitious — I'd rather build a plan you can actually keep. You've seen the roles
            now, so this shapes a timeline against those.
          </CardHint>
          <div className="mt-4 flex flex-wrap gap-2">
            {WEEKLY_OPTIONS.map((option: WeeklyOption) => (
              <button
                key={option.hours}
                type="button"
                onClick={() => patch({ weeklyHours: option.hours })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  form.weeklyHours === option.hours
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Label className="mt-6 block text-xs font-semibold tracking-wide uppercase">
            And how long do you have? ({form.months} month{form.months === 1 ? "" : "s"})
          </Label>
          <Slider
            value={[form.months]}
            min={1}
            max={18}
            step={1}
            onValueChange={([months]) => patch({ months: months ?? 6 })}
            className="mt-3"
          />
          <Label htmlFor="goal" className="mt-6 block text-xs font-semibold tracking-wide uppercase">
            What are you working toward, in your own words?
          </Label>
          <Textarea
            id="goal"
            value={form.goal}
            onChange={(e) => patch({ goal: e.target.value })}
            rows={3}
            className="mt-2"
            placeholder="A data role where I'm not the only woman in the room."
          />
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("jobs")} className="gap-1.5">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              disabled={busy || form.goal.trim().length < 3}
              onClick={() => void buildRoadmap()}
              className="gap-2"
            >
              Build my roadmap <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardTitle>"{form.goal}" — written down, and everything below serves it</CardTitle>
          <CardHint>
            {gapPreview.gaps.length} skill{gapPreview.gaps.length === 1 ? "" : "s"} to close, sequenced so you're
            never guessing what's next. Roadmap, Network and Mentor Match are unlocked now. You don't have to feel
            ready — you just have to start.
          </CardHint>
          <Link
            to="/roadmap"
            className="animate-pop mt-5 inline-flex items-center gap-2 rounded-xl bg-warm-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
          >
            <PartyPopper className="size-4" /> Open my roadmap
          </Link>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="animate-rise rounded-2xl border border-border bg-card p-5 shadow-warm md:p-6">
      {children}
    </section>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg leading-snug font-semibold">{children}</h2>;
}

function CardHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="size-4" /> Back
      </Button>
      <Button onClick={onNext} disabled={nextDisabled} className="gap-2">
        Continue <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-sm whitespace-pre-line">{value || "—"}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0 gap-1.5 text-primary">
        <Pencil className="size-3.5" /> Edit
      </Button>
    </div>
  );
}

function JobCard({
  job,
  busy,
  onDecide,
}: {
  job: Job;
  busy: boolean;
  onDecide: (job: Job, liked: boolean) => Promise<void>;
}) {
  return (
    <div className="animate-pop rounded-2xl border border-border bg-card p-5 shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg leading-tight font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">
            {job.company} · {job.location}
          </p>
        </div>
        {job.seniority && (
          <Badge variant="secondary" className="shrink-0">
            {job.seniority}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.required_skills.map((skill) => (
          <Badge key={skill} variant="outline" className="bg-secondary/60">
            {skill}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {job.is_example ? (
          <Badge variant="outline" className="border-dashed">
            Example role — not a live posting
          </Badge>
        ) : (
          job.source && <span>Found on {job.source}</span>
        )}
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            View the original posting
          </a>
        )}
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1 gap-2" disabled={busy} onClick={() => void onDecide(job, false)}>
          <X className="size-4" /> Not for me
        </Button>
        <Button className="flex-1 gap-2" disabled={busy} onClick={() => void onDecide(job, true)}>
          <Heart className="size-4" /> Keep it
        </Button>
      </div>
    </div>
  );
}
