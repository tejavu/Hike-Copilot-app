import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  Heart,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useRoadmap } from "@/hooks/useCoachData";
import { useReflections } from "@/hooks/useNetworkData";
import {
  useAddActions,
  useCreateSession,
  useMentorActions,
  useMentorMatches,
  useMentorPreferences,
  useMentorSessions,
  useMentors,
  useRecordMatches,
  useSavePreferences,
  useSetMatchStatus,
} from "@/hooks/useMentorData";
import {
  CADENCE_LABELS,
  DEFAULT_DIRECTORY_FILTERS,
  activeFilterCount,
  directoryFacets,
  filterMatches,
  formatSlot,
  nextCheckInFrom,
  rankMentors,
  type DirectoryFilters,
  type MatchStatus,
  type MeetingPref,
  type Mentor,
  type ReminderCadence,
} from "@/lib/mentors";
import { MentorCard } from "@/components/mentor/MentorCard";
import { MentorDetailDialog } from "@/components/mentor/MentorDetailDialog";
import { NeedsAssessment, type AssessmentDraft } from "@/components/mentor/NeedsAssessment";
import { ScheduleDialog } from "@/components/mentor/ScheduleDialog";
import {
  ActionPlanList,
  FollowUpCard,
  UpcomingSessionCard,
} from "@/components/mentor/SessionWorkspace";

export function MentorMatchView() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: roadmap } = useRoadmap();
  const { data: reflections } = useReflections();
  const { data: mentors, isLoading: mentorsLoading, isError, refetch } = useMentors();
  const { data: preferences, isLoading: prefsLoading } = useMentorPreferences();
  const { data: matches } = useMentorMatches();
  const { data: sessions } = useMentorSessions();
  const { data: actions } = useMentorActions();

  const savePreferences = useSavePreferences();
  const recordMatches = useRecordMatches();
  const setMatchStatus = useSetMatchStatus();
  const createSession = useCreateSession();
  const addActions = useAddActions();

  const [assessing, setAssessing] = useState(false);
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_DIRECTORY_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Mentor | null>(null);

  const roadmapSkills = useMemo(
    () => (roadmap?.skills ?? []).map((skill) => ({ id: skill.id, name: skill.name })),
    [roadmap],
  );

  const gapSkills = useMemo(() => roadmapSkills.map((skill) => skill.name), [roadmapSkills]);

  const builds = useMemo(
    () =>
      (roadmap?.items ?? [])
        .filter((item) => item.item_type === "build" && item.done)
        .map((item) => item.title),
    [roadmap],
  );
  const certifications = useMemo(
    () =>
      (roadmap?.items ?? [])
        .filter((item) => item.item_type === "certify" && item.done)
        .map((item) => item.title),
    [roadmap],
  );
  const eventTakeaways = useMemo(
    () =>
      (reflections ?? [])
        .map((reflection) => reflection.takeaway)
        .filter((takeaway): takeaway is string => Boolean(takeaway && takeaway.trim()))
        .slice(0, 4),
    [reflections],
  );

  const facets = useMemo(() => directoryFacets(mentors ?? []), [mentors]);

  const ranked = useMemo(() => {
    if (!mentors) return [];
    return rankMentors(mentors, {
      prioritySkills: preferences?.priority_skills?.length
        ? preferences.priority_skills
        : gapSkills.slice(0, 4),
      targetRole: preferences?.target_role ?? profile?.goal ?? null,
      language: preferences?.language ?? null,
      locationPref: preferences?.location_pref ?? "either",
      userLocation: profile?.location ?? null,
      guidanceStyle: preferences?.guidance_style ?? null,
      availabilityNotes: preferences?.availability_notes ?? null,
    });
  }, [mentors, preferences, gapSkills, profile?.goal, profile?.location]);

  const filtered = useMemo(() => filterMatches(ranked, filters), [ranked, filters]);

  const statusOf = (mentorId: string): MatchStatus | undefined =>
    matches?.find((match) => match.mentor_id === mentorId)?.status;

  const selectedMentorId = preferences?.selected_mentor_id ?? null;
  const selectedMentor = useMemo(
    () => (mentors ?? []).find((mentor) => mentor.id === selectedMentorId) ?? null,
    [mentors, selectedMentorId],
  );
  const detailResult = useMemo(
    () => ranked.find((row) => row.mentor.id === detailId) ?? null,
    [ranked, detailId],
  );
  const shortlisted = useMemo(
    () => ranked.filter((row) => ["shortlisted", "selected"].includes(statusOf(row.mentor.id) ?? "")),
    [ranked, matches],
  );

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [sessions],
  );
  const nextSession = sortedSessions.find(
    (session) => session.status === "scheduled" && new Date(session.starts_at).getTime() > Date.now() - 36e5,
  );
  const awaitingLog = sortedSessions.filter(
    (session) =>
      session.status !== "cancelled" &&
      session !== nextSession &&
      !session.recap &&
      new Date(session.starts_at).getTime() <= Date.now(),
  );
  const completed = sortedSessions.filter((session) => session.status === "completed");

  const mentorById = (id: string | null) =>
    (mentors ?? []).find((mentor) => mentor.id === id) ?? null;

  /* ------------------------------- handlers ------------------------------- */

  const submitAssessment = async (draft: AssessmentDraft) => {
    await savePreferences.mutateAsync({
      goal: draft.goal || null,
      target_role: draft.target_role || null,
      priority_skills: draft.priority_skills,
      guidance_style: draft.guidance_style,
      language: draft.language,
      location_pref: draft.location_pref,
      availability_notes: draft.availability_notes || null,
      session_focus: draft.session_focus || null,
      completed_at: new Date().toISOString(),
    });
    setAssessing(false);
    toast.success("Got it. Here's who I'd talk to in your position.");
  };

  // Persist the current run so the shortlist and history survive reloads.
  const persistRun = () => {
    if (ranked.length === 0) return;
    recordMatches.mutate(
      ranked.slice(0, 8).map((row) => ({
        mentor_id: row.mentor.id,
        score: row.score,
        reasons: row.reasons,
        matched_attributes: row.matchedAttributes,
      })),
    );
  };

  const shortlist = (mentorId: string) => {
    const row = ranked.find((item) => item.mentor.id === mentorId);
    const already = statusOf(mentorId);
    const next: MatchStatus = already === "shortlisted" || already === "selected" ? "suggested" : "shortlisted";
    setMatchStatus.mutate(
      {
        mentorId,
        status: next,
        score: row?.score ?? 0,
        reasons: row?.reasons ?? [],
        matchedAttributes: row?.matchedAttributes ?? [],
      },
      {
        onSuccess: () =>
          toast.success(next === "shortlisted" ? "Shortlisted — no pressure to decide." : "Removed from your shortlist."),
      },
    );
  };

  const choose = (mentorId: string) => {
    const row = ranked.find((item) => item.mentor.id === mentorId);
    setMatchStatus.mutate(
      {
        mentorId,
        status: "selected",
        score: row?.score ?? 0,
        reasons: row?.reasons ?? [],
        matchedAttributes: row?.matchedAttributes ?? [],
      },
      {
        onSuccess: async () => {
          await savePreferences.mutateAsync({ selected_mentor_id: mentorId });
          setDetailId(null);
          toast.success(`${row?.mentor.full_name.split(" ")[0] ?? "She"}'s your mentor. Let's book time.`);
          if (row) setScheduleFor(row.mentor);
        },
      },
    );
  };

  const setCadence = (cadence: ReminderCadence) => {
    const next = cadence === "off" ? null : nextCheckInFrom(new Date(), cadence);
    savePreferences.mutate(
      { reminder_cadence: cadence, next_check_in_at: next, reminder_pending: false },
      {
        onSuccess: () =>
          toast.success(
            cadence === "off"
              ? "Reminders off. You're in charge."
              : `I'll nudge you here ${CADENCE_LABELS[cadence].toLowerCase()}.`,
          ),
      },
    );
  };

  /* -------------------------------- states -------------------------------- */

  if (profileLoading || mentorsLoading || prefsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="I couldn't load the mentors"
        body="Something went wrong reaching the directory. It's almost certainly temporary."
        action={
          <Button onClick={() => void refetch()} variant="outline">
            Try again
          </Button>
        }
      />
    );
  }

  const needsAssessment = !preferences?.completed_at;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-warm-gradient p-6 text-primary-foreground shadow-lift md:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase opacity-90">
          <Heart className="size-3.5" />
          Mentor Match
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
          Someone who's already walked it
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-90 md:text-base">
          Volunteer mentors who know the road you're on. I'll line them up against your goal, your roadmap
          gaps and how you actually want to be helped — then you choose.
        </p>
      </header>

      {preferences?.reminder_pending && selectedMentor && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-4">
          <p className="inline-flex items-start gap-2 text-sm">
            <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              It's been a while since you spoke with {selectedMentor.full_name.split(" ")[0]}. Want to book
              another session? (Reminders live here in the app — Ada isn't emailing you.)
            </span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setScheduleFor(selectedMentor)}>
              Book a check-in
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                savePreferences.mutate({
                  reminder_pending: false,
                  next_check_in_at: nextCheckInFrom(
                    new Date(),
                    preferences.reminder_cadence === "off" ? "monthly" : preferences.reminder_cadence,
                  ),
                })
              }
            >
              Later
            </Button>
          </div>
        </div>
      )}

      {needsAssessment || assessing ? (
        <NeedsAssessment
          existing={preferences ?? null}
          inferred={{
            goal: profile?.goal ?? "",
            targetRole: profile?.goal ?? "",
            gapSkills,
            location: profile?.location ?? "",
          }}
          languages={facets.languages.length ? facets.languages : ["English"]}
          saving={savePreferences.isPending}
          onSubmit={(draft) => void submitAssessment(draft)}
          onCancel={needsAssessment ? undefined : () => setAssessing(false)}
        />
      ) : (
        <Tabs defaultValue="matches" onValueChange={(value) => value === "matches" && persistRun()}>
          <TabsList>
            <TabsTrigger value="matches" className="gap-1.5">
              <Sparkles className="size-3.5" /> Matches
            </TabsTrigger>
            <TabsTrigger value="directory" className="gap-1.5">
              <Users className="size-3.5" /> Directory
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1.5">
              <CalendarClock className="size-3.5" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="relationship" className="gap-1.5">
              <Heart className="size-3.5" /> Progress
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------ matches ------------------------------ */}
          <TabsContent value="matches" className="mt-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-border bg-card p-5">
              <div className="max-w-2xl">
                <h2 className="font-display text-xl font-semibold">Your strongest matches</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  These percentages are a compatibility guide built from what you told me — skills, target
                  role, language, format and availability. They're not a prediction of how well you'll click.
                  Several people here are close in fit on purpose: read them and pick the one you'd actually
                  want in your corner.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAssessing(true)}>
                <SlidersHorizontal className="size-3.5" />
                Update what I need
              </Button>
            </div>

            {ranked.length === 0 ? (
              <EmptyState
                title="No mentors in the directory yet"
                body="The volunteer directory is empty right now. Check back soon."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {ranked.slice(0, 6).map((row) => (
                  <MentorCard
                    key={row.mentor.id}
                    result={row}
                    status={statusOf(row.mentor.id)}
                    onOpen={() => setDetailId(row.mentor.id)}
                    onShortlist={() => shortlist(row.mentor.id)}
                    onSelect={() => choose(row.mentor.id)}
                  />
                ))}
              </div>
            )}

            {shortlisted.length > 0 && (
              <section className="space-y-3">
                <h3 className="font-display text-lg font-semibold">Your shortlist</h3>
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {shortlisted.map((row) => (
                    <MentorCard
                      key={row.mentor.id}
                      result={row}
                      status={statusOf(row.mentor.id)}
                      onOpen={() => setDetailId(row.mentor.id)}
                      onShortlist={() => shortlist(row.mentor.id)}
                      onSelect={() => choose(row.mentor.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          {/* ----------------------------- directory ----------------------------- */}
          <TabsContent value="directory" className="mt-5 space-y-5">
            <section
              aria-label="Search and filter mentors"
              className="rounded-3xl border border-border bg-card/70 p-4 shadow-warm"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[14rem] flex-1 space-y-1.5">
                  <Label htmlFor="mentor-search" className="text-xs">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="mentor-search"
                      className="pl-9"
                      placeholder="Name, company, skill, topic"
                      value={filters.query}
                      onChange={(event) => setFilters({ ...filters, query: event.target.value })}
                    />
                  </div>
                </div>
                <FacetSelect
                  id="filter-expertise"
                  label="Expertise"
                  value={filters.expertise}
                  options={facets.expertise}
                  onChange={(value) => setFilters({ ...filters, expertise: value })}
                />
                <FacetSelect
                  id="filter-role"
                  label="Role"
                  value={filters.role}
                  options={facets.roles}
                  onChange={(value) => setFilters({ ...filters, role: value })}
                />
                <FacetSelect
                  id="filter-language"
                  label="Language"
                  value={filters.language}
                  options={facets.languages}
                  onChange={(value) => setFilters({ ...filters, language: value })}
                />
                <FacetSelect
                  id="filter-location"
                  label="Location"
                  value={filters.location}
                  options={facets.locations}
                  onChange={(value) => setFilters({ ...filters, location: value })}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="filter-format" className="text-xs">
                    Format
                  </Label>
                  <Select
                    value={filters.meeting}
                    onValueChange={(value) =>
                      setFilters({ ...filters, meeting: value as MeetingPref | "all" })
                    }
                  >
                    <SelectTrigger id="filter-format" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any format</SelectItem>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="in_person">In person</SelectItem>
                      <SelectItem value="either">Either</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    id="filter-available"
                    checked={filters.availableOnly}
                    onCheckedChange={(checked) => setFilters({ ...filters, availableOnly: checked })}
                  />
                  <Label htmlFor="filter-available" className="text-sm">
                    Has openings
                  </Label>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {filtered.length} of {ranked.length} mentors
                </Badge>
                {activeFilterCount(filters) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setFilters(DEFAULT_DIRECTORY_FILTERS)}
                  >
                    <X className="size-3.5" />
                    Clear filters
                  </Button>
                )}
              </div>
            </section>

            <p className="rounded-2xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
              Every profile here is a clearly-labelled demo mentor — realistic stand-ins built so the whole
              mentoring flow works end to end. Nobody listed is a real person waiting for your message.
            </p>

            {filtered.length === 0 ? (
              <EmptyState
                title="Nobody matches those filters"
                body="Try loosening one filter — dropping the location or the format usually opens things up."
                action={
                  <Button variant="outline" onClick={() => setFilters(DEFAULT_DIRECTORY_FILTERS)}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filtered.map((row) => (
                  <MentorCard
                    key={row.mentor.id}
                    result={row}
                    status={statusOf(row.mentor.id)}
                    onOpen={() => setDetailId(row.mentor.id)}
                    onShortlist={() => shortlist(row.mentor.id)}
                    onSelect={() => choose(row.mentor.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ----------------------------- sessions ----------------------------- */}
          <TabsContent value="sessions" className="mt-5 space-y-5">
            {!selectedMentor ? (
              <EmptyState
                title="No mentor chosen yet"
                body="Once you pick someone from your matches, her open times show up here and you can book a first session."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-5">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Your mentor
                    </p>
                    <h2 className="font-display text-xl font-semibold">{selectedMentor.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedMentor.title} · {selectedMentor.company}
                    </p>
                  </div>
                  <Button className="gap-1.5" onClick={() => setScheduleFor(selectedMentor)}>
                    <CalendarClock className="size-4" />
                    Book a session
                  </Button>
                </div>

                {nextSession ? (
                  <UpcomingSessionCard
                    session={nextSession}
                    mentor={mentorById(nextSession.mentor_id) ?? selectedMentor}
                    roadmapSkills={roadmapSkills}
                    prep={{
                      goal: preferences?.goal ?? profile?.goal ?? null,
                      targetRole: preferences?.target_role ?? null,
                      prioritySkills: preferences?.priority_skills?.length
                        ? preferences.priority_skills
                        : gapSkills.slice(0, 4),
                      builds,
                      certifications,
                      eventTakeaways,
                      sessionFocus: preferences?.session_focus ?? null,
                    }}
                  />
                ) : (
                  <EmptyState
                    title="Nothing on the calendar"
                    body={`${selectedMentor.full_name.split(" ")[0]} keeps time open — ${selectedMentor.availability_summary.toLowerCase()}. Book a slot and I'll prep you for it.`}
                    action={
                      <Button onClick={() => setScheduleFor(selectedMentor)}>Pick a time</Button>
                    }
                  />
                )}

                {awaitingLog.map((session) => (
                  <FollowUpCard
                    key={session.id}
                    session={session}
                    mentor={mentorById(session.mentor_id) ?? selectedMentor}
                    roadmapSkills={roadmapSkills}
                  />
                ))}
              </>
            )}
          </TabsContent>

          {/* --------------------------- relationship --------------------------- */}
          <TabsContent value="relationship" className="mt-5 space-y-5">
            {!selectedMentor ? (
              <EmptyState
                title="Your mentoring story starts with one choice"
                body="Pick a mentor and this becomes your record: sessions you've had, what you agreed to do, and when you're next talking."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Sessions completed" value={String(completed.length)} />
                  <Stat
                    label="Next session"
                    value={nextSession ? formatSlot(nextSession.starts_at) : "Not booked"}
                  />
                  <Stat
                    label="Actions done"
                    value={`${(actions ?? []).filter((action) => action.done).length}/${(actions ?? []).length}`}
                  />
                </div>

                <section className="rounded-3xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-semibold">Action plan</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    What you agreed to do. Items linked to a roadmap skill show up there as committed work —
                    never as proof you've mastered it.
                  </p>
                  <ActionPlanList actions={actions ?? []} mentorName={selectedMentor.full_name} />
                </section>

                <section className="rounded-3xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-semibold">Check-in history</h3>
                  {completed.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No sessions logged yet. After your first one, your recaps and the advice worth keeping
                      live here.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {completed.map((session) => (
                        <li key={session.id} className="rounded-2xl border border-border p-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium">{formatSlot(session.starts_at)}</p>
                            {session.recap_source === "teams_recap" && (
                              <Badge variant="outline" className="font-normal">
                                From Teams recap
                              </Badge>
                            )}
                          </div>
                          {session.theme && <p className="text-sm text-muted-foreground">{session.theme}</p>}
                          {session.key_advice && (
                            <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic">
                              {session.key_advice}
                            </p>
                          )}
                          {session.recap && (
                            <p className="mt-2 text-sm whitespace-pre-line">{session.recap}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-3xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-semibold">Reconnect reminders</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Mentoring works when it keeps happening. I'll surface a gentle nudge here in the app when
                    it's time — Ada doesn't send email, because that needs a verified sending domain that
                    isn't set up for this app.
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cadence" className="text-xs">
                        Nudge me
                      </Label>
                      <Select
                        value={preferences?.reminder_cadence ?? "monthly"}
                        onValueChange={(value) => setCadence(value as ReminderCadence)}
                      >
                        <SelectTrigger id="cadence" className="w-52">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CADENCE_LABELS) as ReminderCadence[]).map((cadence) => (
                            <SelectItem key={cadence} value={cadence}>
                              {CADENCE_LABELS[cadence]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {preferences?.next_check_in_at && preferences.reminder_cadence !== "off" && (
                      <p className="pb-2 text-sm text-muted-foreground">
                        Next nudge around {new Date(preferences.next_check_in_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <MentorDetailDialog
        result={detailResult}
        status={detailResult ? statusOf(detailResult.mentor.id) : undefined}
        open={Boolean(detailResult)}
        onOpenChange={(open) => !open && setDetailId(null)}
        onShortlist={() => detailResult && shortlist(detailResult.mentor.id)}
        onSelect={() => detailResult && choose(detailResult.mentor.id)}
      />

      <ScheduleDialog
        mentor={scheduleFor}
        open={Boolean(scheduleFor)}
        saving={createSession.isPending}
        defaultTheme={
          preferences?.session_focus ||
          (gapSkills[0] ? `Where I'm stuck on ${gapSkills[0]}` : "Where I go from here")
        }
        onOpenChange={(open) => !open && setScheduleFor(null)}
        onConfirm={({ slot, theme }) => {
          if (!scheduleFor) return;
          createSession.mutate(
            {
              mentorId: scheduleFor.id,
              startsAt: slot.start.toISOString(),
              endsAt: slot.end.toISOString(),
              theme,
            },
            {
              onSuccess: () => {
                setScheduleFor(null);
                toast.success(`Booked for ${formatSlot(slot.start)}. I'll help you prep.`);
              },
              onError: () => toast.error("That didn't save. Try again?"),
            },
          );
        }}
      />
    </div>
  );
}

function FacetSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any {label.toLowerCase()}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
      <Sparkles className="mx-auto size-6 text-primary" aria-hidden="true" />
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
