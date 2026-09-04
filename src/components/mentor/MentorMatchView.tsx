import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarClock,
  Heart,
  Mail,
  MessageCircleHeart,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useRoadmap } from "@/hooks/useCoachData";
import { useReflections } from "@/hooks/useNetworkData";
import {
  useCreateSession,
  useMentorActions,
  useMentorMatches,
  useMentorPreferences,
  useMentorSessions,
  useMentors,
  useRecordMatches,
  useSaveSessionFeedback,
  useSavePreferences,
  useSessionFeedback,
  useSetMatchStatus,
} from "@/hooks/useMentorData";
import {
  CADENCE_LABELS,
  EMAIL_STATUS_LABELS,
  directoryFacets,
  formatSlot,
  nextCheckInFrom,
  pickBestMentor,
  activeCooldown,
  MENTOR_COOLDOWN_DAYS,
  rankMentors,
  type EmailStatus,
  type Mentor,
  type MentorSession,
  type ReminderCadence,
} from "@/lib/mentors";
import { MentorDetailDialog } from "@/components/mentor/MentorDetailDialog";
import { MatchConfirmation } from "@/components/mentor/MatchConfirmation";
import { NeedsAssessment, type AssessmentDraft } from "@/components/mentor/NeedsAssessment";
import { ScheduleDialog } from "@/components/mentor/ScheduleDialog";
import { SessionFeedbackDialog } from "@/components/mentor/SessionFeedbackDialog";
import {
  ActionPlanList,
  FollowUpCard,
  UpcomingSessionCard,
} from "@/components/mentor/SessionWorkspace";
import { sendSessionConfirmation } from "@/lib/mentor-email.functions";
import { requestMentorMatch } from "@/lib/mentor-request.functions";
import { generateGapMentors, MENTOR_GAP_THRESHOLD } from "@/lib/mentor-generate.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function MentorMatchView() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: roadmap } = useRoadmap();
  const { data: reflections } = useReflections();
  const { data: mentors, isLoading: mentorsLoading, isError, refetch } = useMentors();
  const { data: preferences, isLoading: prefsLoading } = useMentorPreferences();
  const { data: matches } = useMentorMatches();
  const { data: sessions } = useMentorSessions();
  const { data: actions } = useMentorActions();
  const { data: feedback } = useSessionFeedback();

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const savePreferences = useSavePreferences();
  const recordMatches = useRecordMatches();
  const setMatchStatus = useSetMatchStatus();
  const createSession = useCreateSession();
  const saveFeedback = useSaveSessionFeedback();

  const [assessing, setAssessing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Mentor | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<MentorSession | null>(null);
  const [findingMore, setFindingMore] = useState(false);

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

  const matchInput = useMemo(
    () => ({
      prioritySkills: preferences?.priority_skills?.length
        ? preferences.priority_skills
        : gapSkills.slice(0, 4),
      targetRole: preferences?.target_role ?? profile?.goal ?? null,
      language: preferences?.language ?? null,
      locationPref: preferences?.location_pref ?? ("either" as const),
      userLocation: profile?.location ?? null,
      guidanceStyle: preferences?.guidance_style ?? null,
      availabilityNotes: preferences?.availability_notes ?? null,
    }),
    [preferences, gapSkills, profile?.goal, profile?.location],
  );

  /** Mentors who already said no to this mentee are out of the running. */
  const declinedMentorIds = useMemo(
    () =>
      new Set(
        (matches ?? []).filter((row) => row.status === "declined").map((row) => row.mentor_id),
      ),
    [matches],
  );
  const availableMentors = useMemo(
    () => (mentors ?? []).filter((mentor) => !declinedMentorIds.has(mentor.id)),
    [mentors, declinedMentorIds],
  );

  /** A request that's with a mentor, waiting on her answer. */
  const pendingMatch = useMemo(
    () => (matches ?? []).find((row) => row.status === "pending_mentor") ?? null,
    [matches],
  );
  const pendingMentor = useMemo(
    () => (mentors ?? []).find((mentor) => mentor.id === pendingMatch?.mentor_id) ?? null,
    [mentors, pendingMatch],
  );
  const lastDeclinedMentor = useMemo(() => {
    const declined = (matches ?? [])
      .filter((row) => row.status === "declined")
      .sort((a, b) => (b.responded_at ?? "").localeCompare(a.responded_at ?? ""))[0];
    return declined ? ((mentors ?? []).find((m) => m.id === declined.mentor_id) ?? null) : null;
  }, [matches, mentors]);

  const ranked = useMemo(
    () => (mentors ? rankMentors(availableMentors, matchInput) : []),
    [mentors, availableMentors, matchInput],
  );

  const timeOfDay = preferences?.preferred_time_of_day ?? "any";
  const timezone = preferences?.timezone ?? null;

  const selectedMentorId = preferences?.selected_mentor_id ?? null;
  const selectedMentor = useMemo(
    () => (mentors ?? []).find((mentor) => mentor.id === selectedMentorId) ?? null,
    [mentors, selectedMentorId],
  );

  /** Hike Copilot's single pick — never a list to shop through. */
  const suggestion = useMemo(() => {
    if (!mentors || selectedMentorId || pendingMatch) return null;
    return pickBestMentor(availableMentors, matchInput, { timeOfDay });
  }, [mentors, availableMentors, matchInput, timeOfDay, selectedMentorId, pendingMatch]);

  const selectedResult = useMemo(
    () => ranked.find((row) => row.mentor.id === selectedMentorId) ?? null,
    [ranked, selectedMentorId],
  );

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [sessions],
  );
  const nextSession = sortedSessions.find(
    (session) =>
      session.status === "scheduled" && new Date(session.starts_at).getTime() > Date.now() - 36e5,
  );
  const pastSessions = sortedSessions.filter(
    (session) =>
      session.status !== "cancelled" &&
      session !== nextSession &&
      new Date(session.starts_at).getTime() <= Date.now(),
  );
  const awaitingLog = pastSessions.filter((session) => !session.recap);
  const completed = sortedSessions.filter((session) => session.status === "completed");
  const feedbackFor_ = (sessionId: string) =>
    (feedback ?? []).find((row) => row.session_id === sessionId) ?? null;
  const awaitingFeedback = pastSessions.filter((session) => !feedbackFor_(session.id));

  const mentorById = (id: string | null) =>
    (mentors ?? []).find((mentor) => mentor.id === id) ?? null;

  /* ------------------------------- handlers ------------------------------- */

  const submitAssessment = async (draft: AssessmentDraft) => {
    await savePreferences.mutateAsync({
      goal: draft.goal || null,
      target_role: draft.target_role || null,
      priority_skills: draft.priority_skills,
      mentorship_topics: draft.mentorship_topics,
      guidance_style: draft.guidance_style,
      language: draft.language,
      location_pref: draft.location_pref,
      availability_notes: draft.availability_notes || null,
      session_focus: draft.session_focus || null,
      preferred_time_of_day: draft.preferred_time_of_day,
      timezone: draft.timezone,
      completed_at: new Date().toISOString(),
    });
    setAssessing(false);
    toast.success("Got it. Let me find the right person for this.");

    // The seeded directory doesn't cover every field. If nobody in it is a
    // credible fit, add one or two labelled demo mentors in her actual field.
    const best = pickBestMentor(availableMentors, { ...matchInput, prioritySkills: draft.priority_skills.length ? draft.priority_skills : matchInput.prioritySkills }, { timeOfDay: draft.preferred_time_of_day });
    if (!best || best.score < MENTOR_GAP_THRESHOLD) {
      try {
        const result = await generateGapMentors({
          data: {
            prioritySkills: draft.priority_skills,
            targetRole: draft.target_role || null,
            language: draft.language,
            city: profile?.location ?? null,
            bestScore: best?.score ?? 0,
          },
        });
        if (result.created > 0) await refetch();
      } catch (error) {
        console.error("mentor gap fill failed", error);
      }
    }
  };

  /** Explicit ask from the empty state: invent labelled demo mentors in her field. */
  const findMoreMentors = async () => {
    setFindingMore(true);
    try {
      const result = await generateGapMentors({
        data: {
          prioritySkills: matchInput.prioritySkills,
          targetRole: matchInput.targetRole,
          language: matchInput.language,
          city: profile?.location ?? null,
          bestScore: 0,
          force: true,
        },
      });
      if (result.created > 0) {
        await refetch();
        toast.success("Found a few more people in your field.");
      } else {
        toast.info("I couldn't add anyone new just now. Try again in a moment.");
      }
    } catch (error) {
      console.error("mentor generation failed", error);
      toast.error("That didn't work. Try again?");
    } finally {
      setFindingMore(false);
    }
  };

  const confirmMentor = async () => {
    if (!suggestion) return;
    setConfirming(true);
    try {
      const result = await requestMentorMatch({
        data: {
          mentorId: suggestion.mentor.id,
          score: suggestion.score,
          reasons: suggestion.reasons,
          matchedAttributes: suggestion.matchedAttributes,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["mentor-matches", user?.id] });
      const first = suggestion.mentor.full_name.split(" ")[0];
      if (result.status === "sent") {
        toast.success(`Your request is with ${first}.`, {
          description: "You'll hear back by email, and I'll open scheduling the moment she accepts.",
        });
      } else {
        toast.info("Request saved, email not sent", { description: result.detail });
      }
    } catch {
      toast.error("That didn't save. Try again?");
    } finally {
      setConfirming(false);
    }
  };


  /** Books the session, notifies the mentor, then confirms back to the mentee. */
  const book = async (input: { slot: { start: Date; end: Date }; theme: string; format: string }) => {
    const mentor = scheduleFor;
    if (!mentor) return;
    try {
      const session = await createSession.mutateAsync({
        mentorId: mentor.id,
        startsAt: input.slot.start.toISOString(),
        endsAt: input.slot.end.toISOString(),
        theme: input.theme,
        meetingFormat: input.format,
      });
      setScheduleFor(null);
      toast.success(`Booked for ${formatSlot(input.slot.start)}. I'll help you prep.`);

      // The mentor is notified first; the slot she published counts as her
      // confirmation, which triggers the mentee's confirmation email.
      await sendSessionConfirmation({
        data: { sessionId: session.id, timezone: timezone ?? "UTC", audience: "mentor" },
      });
      const result = await sendSessionConfirmation({
        data: { sessionId: session.id, timezone: timezone ?? "UTC", audience: "mentee" },
      });
      if (result.status === "sent") {
        toast.success(`${mentor.full_name.split(" ")[0]} confirmed — the details are in your inbox.`);
      } else if (result.status === "not_configured") {
        toast.info("Confirmation email is ready but not sent", { description: result.detail });
      } else {
        toast.error("The confirmation email didn't go out", { description: result.detail });
      }
    } catch {
      toast.error("That didn't save. Try again?");
    }
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

  /**
   * Cancelling a session pauses mentoring for 30 days: no new match, and no new
   * booking with the current mentor either, so a volunteer's calendar isn't
   * held and released repeatedly.
   */
  const cooldownUntil = activeCooldown(preferences?.cooldown_until);
  const cooldownActive = Boolean(cooldownUntil) && !selectedMentor;
  const bookingPaused = Boolean(cooldownUntil);
  const cooldownDate = cooldownUntil
    ? cooldownUntil.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";


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
          Tell me what you need and when you're free. I'll match you with one volunteer mentor from
          our directory — the best fit for your goal, your roadmap gaps and your availability — and
          book the session for you.
        </p>
      </header>

      {preferences?.reminder_pending && selectedMentor && !bookingPaused && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-4">
          <p className="inline-flex items-start gap-2 text-sm">
            <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              It's been a while since you spoke with {selectedMentor.full_name.split(" ")[0]}. Want
              to book another session? (Reminders live here in the app.)
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
                    preferences.reminder_cadence === "off"
                      ? "monthly"
                      : preferences.reminder_cadence,
                  ),
                })
              }
            >
              Later
            </Button>
          </div>
        </div>
      )}

      {cooldownActive ? (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-lift md:p-8">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Mentoring paused
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            You can request a new mentor from {cooldownDate}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Because a session was cancelled, matching takes a {MENTOR_COOLDOWN_DAYS}-day pause.
            Mentors here volunteer their time, and the short gap keeps their calendars from being
            held and released. Nothing is lost — your preferences, notes and past sessions all stay
            exactly as they are, and everything else in Hike Copilot keeps working meanwhile.
          </p>
        </section>
      ) : needsAssessment || assessing ? (
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
          {...(needsAssessment ? {} : { onCancel: () => setAssessing(false) })}
        />
      ) : !selectedMentor ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-border bg-card p-5">
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              You don't have to compare profiles or pick from a list — I've matched you with one
              person from the directory who fits what you asked for, and I ask her on your behalf.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setAssessing(true)}
            >
              <SlidersHorizontal className="size-3.5" />
              Update what I need
            </Button>
          </div>

          {lastDeclinedMentor && !pendingMentor && (
            <div className="rounded-3xl border border-border bg-muted/40 p-5">
              <h3 className="font-display text-lg font-semibold">
                {lastDeclinedMentor.full_name.split(" ")[0]} can't take this on right now
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Mentors volunteer their time, so availability comes and goes — this says nothing
                about you or your request. I've found the next best fit below and I can ask her for
                you.
              </p>
            </div>
          )}

          {pendingMentor && pendingMatch ? (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-lift md:p-8">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                {pendingMatch.request_email_status === "sent" ? "Request sent" : "Request saved"}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold">
                {pendingMatch.request_email_status === "sent"
                  ? `${pendingMentor.full_name} has your request`
                  : `Your request for ${pendingMentor.full_name} is saved`}
              </h2>
              {pendingMatch.request_email_status === "sent" ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  I sent her what you told me — your goal, what you're looking for from mentoring
                  and the focus for a first session. She'll accept or decline by email. As soon as
                  she accepts, scheduling opens here and you'll get a note in your inbox. Nothing
                  is booked until then.
                </p>
              ) : (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {pendingMatch.request_email_detail ??
                    "The email to your mentor didn't go out, so she doesn't know about this yet."}{" "}
                  Your request itself is saved — as soon as the email reaches her and she accepts,
                  scheduling opens here.
                </p>
              )}
              <p className="mt-4 text-sm text-muted-foreground">
                {pendingMentor.title} · {pendingMentor.company} ·{" "}
                {pendingMentor.availability_summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowProfile(true)}>
                  See her full profile
                </Button>
              </div>
            </section>
          ) : suggestion ? (

            <MatchConfirmation
              result={suggestion}
              timeOfDay={timeOfDay}
              confirming={confirming}
              onConfirm={() => void confirmMentor()}
              onViewProfile={() => setShowProfile(true)}
            />
          ) : (
            <EmptyState
              title="Nobody in the directory fits that yet"
              body="I can put together a few mentor profiles in your field right now, or you can loosen one thing — the language, the format or how near they need to be — and I'll look again."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => void findMoreMentors()} disabled={findingMore}>
                    {findingMore ? "Finding people…" : "Find mentors in my field"}
                  </Button>
                  <Button variant="outline" onClick={() => setAssessing(true)}>
                    Update what I need
                  </Button>
                </div>
              }
            />
          )}
        </div>
      ) : (
        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions" className="gap-1.5">
              <CalendarClock className="size-3.5" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="relationship" className="gap-1.5">
              <Heart className="size-3.5" /> Progress
            </TabsTrigger>
          </TabsList>

          {/* ----------------------------- sessions ----------------------------- */}
          <TabsContent value="sessions" className="mt-5 space-y-5">
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
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setShowProfile(true)}>
                  Why we matched
                </Button>
                {bookingPaused ? (
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Booking is paused until {cooldownDate} because a session was cancelled.
                  </p>
                ) : (
                  <Button className="gap-1.5" onClick={() => setScheduleFor(selectedMentor)}>
                    <CalendarClock className="size-4" />
                    Book a session
                  </Button>
                )}
              </div>
            </div>


            {nextSession ? (
              <>
                <EmailState session={nextSession} />
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
              </>
            ) : bookingPaused ? (
              <EmptyState
                title="Mentoring is paused"
                body={`Because a session was cancelled, new bookings open again on ${cooldownDate}. Your mentor, notes and past sessions all stay as they are.`}
              />
            ) : (
              <EmptyState
                title="Nothing on the calendar"
                body={`${selectedMentor.full_name.split(" ")[0]} keeps time open — ${selectedMentor.availability_summary.toLowerCase()}. Book a slot and I'll prep you for it.`}
                action={<Button onClick={() => setScheduleFor(selectedMentor)}>Pick a time</Button>}
              />
            )}


            {awaitingFeedback.map((session) => (
              <div
                key={`fb-${session.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-5"
              >
                <p className="inline-flex items-start gap-2 text-sm">
                  <MessageCircleHeart className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Your session on {formatSlot(session.starts_at)} has been and gone. How did it
                    go? Two minutes, and it shapes what I suggest next.
                  </span>
                </p>
                <Button size="sm" onClick={() => setFeedbackFor(session)}>
                  Give feedback
                </Button>
              </div>
            ))}

            {awaitingLog.map((session) => (
              <FollowUpCard
                key={session.id}
                session={session}
                mentor={mentorById(session.mentor_id) ?? selectedMentor}
                roadmapSkills={roadmapSkills}
              />
            ))}
          </TabsContent>

          {/* --------------------------- relationship --------------------------- */}
          <TabsContent value="relationship" className="mt-5 space-y-5">
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
                What you agreed to do. Items linked to a roadmap skill show up there as committed
                work — never as proof you've mastered it.
              </p>
              <ActionPlanList actions={actions ?? []} mentorName={selectedMentor.full_name} />
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-semibold">Session history</h3>
              {pastSessions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No sessions logged yet. After your first one, your recaps, your feedback and the
                  advice worth keeping live here.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {pastSessions.map((session) => {
                    const row = feedbackFor_(session.id);
                    return (
                      <li key={session.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="font-medium">{formatSlot(session.starts_at)}</p>
                          {session.recap_source === "teams_recap" && (
                            <Badge variant="outline" className="font-normal">
                              From Teams recap
                            </Badge>
                          )}
                        </div>
                        {session.theme && (
                          <p className="text-sm text-muted-foreground">{session.theme}</p>
                        )}
                        {session.key_advice && (
                          <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic">
                            {session.key_advice}
                          </p>
                        )}
                        {session.recap && (
                          <p className="mt-2 text-sm whitespace-pre-line">{session.recap}</p>
                        )}

                        {row ? (
                          <div className="mt-3 rounded-2xl bg-accent/40 p-3 text-sm text-accent-foreground">
                            <p className="text-xs font-semibold tracking-wide uppercase">
                              Your feedback
                            </p>
                            <p className="mt-1">
                              {row.attended ? "Attended" : "Didn't happen"}
                              {row.rating ? ` · ${row.rating}/5 useful` : ""}
                            </p>
                            {row.helpful && <p className="mt-1">Most helpful: {row.helpful}</p>}
                            {row.comments && <p className="mt-1 italic">{row.comments}</p>}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 px-0"
                              onClick={() => setFeedbackFor(session)}
                            >
                              Edit feedback
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5"
                            onClick={() => setFeedbackFor(session)}
                          >
                            <MessageCircleHeart className="size-3.5" />
                            How did it go?
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-semibold">Reconnect reminders</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Mentoring works when it keeps happening. I'll surface a gentle nudge here in the app
                when it's time.
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
          </TabsContent>
        </Tabs>
      )}

      <MentorDetailDialog
        result={
          selectedResult ??
          suggestion ??
          ranked.find((row) => row.mentor.id === pendingMatch?.mentor_id) ??
          null
        }
        status={selectedMentorId ? "selected" : pendingMatch ? "pending_mentor" : undefined}

        open={showProfile}
        onOpenChange={setShowProfile}
      />

      <ScheduleDialog
        mentor={scheduleFor}
        open={Boolean(scheduleFor)}
        saving={createSession.isPending}
        timeOfDay={timeOfDay}
        timezone={timezone}
        defaultTheme={
          preferences?.session_focus ||
          (gapSkills[0] ? `Where I'm stuck on ${gapSkills[0]}` : "Where I go from here")
        }
        onOpenChange={(open) => !open && setScheduleFor(null)}
        onConfirm={(input) => void book(input)}
      />

      <SessionFeedbackDialog
        session={feedbackFor}
        mentorName={
          (feedbackFor ? mentorById(feedbackFor.mentor_id)?.full_name : null) ??
          selectedMentor?.full_name ??
          "your mentor"
        }
        existing={feedbackFor ? feedbackFor_(feedbackFor.id) : null}
        open={Boolean(feedbackFor)}
        saving={saveFeedback.isPending}
        onOpenChange={(open) => !open && setFeedbackFor(null)}
        onSubmit={(draft) => {
          if (!feedbackFor) return;
          saveFeedback.mutate(
            {
              sessionId: feedbackFor.id,
              mentorId: feedbackFor.mentor_id,
              attended: draft.attended,
              rating: draft.attended ? draft.rating : null,
              helpful: draft.helpful.trim() || null,
              comments: draft.comments.trim() || null,
              continueWithMentor: true,
              followupRequest: null,
            },
            {
              onSuccess: () => {
                setFeedbackFor(null);
                toast.success("Thank you — that's saved to your mentoring history.");
              },
              onError: () => toast.error("That didn't save. Try again?"),
            },
          );
        }}
      />
    </div>
  );
}

/** Honest delivery state for the booking confirmation email. */
function EmailState({ session }: { session: MentorSession }) {
  const status = (session.email_status ?? "pending") as EmailStatus;
  const tone =
    status === "sent"
      ? "border-border bg-card"
      : status === "failed"
        ? "border-destructive/30 bg-destructive/5"
        : "border-border bg-muted/60";
  return (
    <div className={`rounded-3xl border p-4 ${tone}`}>
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <Mail className="size-4 text-primary" />
        {EMAIL_STATUS_LABELS[status]}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {session.email_detail ??
          "Your confirmation is written and waiting. Download the calendar file below so the time is locked in either way."}
      </p>
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
