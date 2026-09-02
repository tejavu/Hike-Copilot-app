import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { refreshEvents } from "@/lib/events.functions";
import {
  CalendarHeart,
  CalendarPlus,
  Compass,
  Heart,
  Loader2,
  MessageCircleHeart,
  NotebookPen,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile, useRoadmap } from "@/hooks/useCoachData";
import {
  useEngagement,
  useEvents,
  useReflections,
  useSetRsvp,
  useToggleSave,
} from "@/hooks/useNetworkData";
import {
  DEFAULT_FILTERS,
  applyFilters,
  buildIcs,
  coordsForLocation,
  formatEventDate,
  scoreEvent,
  type Filters,
  type NetworkEvent,
  type RsvpStatus,
} from "@/lib/events";
import { EventCard } from "@/components/network/EventCard";
import { EventFilters } from "@/components/network/EventFilters";
import { ReflectionDialog } from "@/components/network/ReflectionDialog";

function downloadIcs(events: NetworkEvent[], filename: string) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function NetworkView() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: roadmap } = useRoadmap();
  const { data: events, isLoading, isError, refetch, isRefetching } = useEvents();
  const { data: engagement } = useEngagement();
  const { data: reflections } = useReflections();
  const toggleSave = useToggleSave();
  const setRsvp = useSetRsvp();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [reflectOn, setReflectOn] = useState<NetworkEvent | null>(null);

  const roadmapSkills = useMemo(
    () => (roadmap?.skills ?? []).map((skill) => ({ id: skill.id, name: skill.name })),
    [roadmap],
  );
  const home = useMemo(() => coordsForLocation(profile?.location), [profile?.location]);

  const scored = useMemo(() => {
    const gapSkills = roadmapSkills.map((skill) => skill.name);
    const haveSkills = profile?.skills ?? [];
    return (events ?? []).map((event) => ({
      event,
      relevance: scoreEvent(event, {
        gapSkills,
        haveSkills,
        home: home ? { lat: home.lat, lng: home.lng } : null,
      }),
    }));
  }, [events, roadmapSkills, profile?.skills, home]);

  const now = Date.now();
  const upcoming = useMemo(
    () => scored.filter((row) => new Date(row.event.starts_at).getTime() >= now),
    [scored, now],
  );
  const past = useMemo(
    () =>
      scored
        .filter((row) => new Date(row.event.starts_at).getTime() < now)
        .sort((a, b) => new Date(b.event.starts_at).getTime() - new Date(a.event.starts_at).getTime()),
    [scored, now],
  );

  const visible = useMemo(() => applyFilters(upcoming, filters), [upcoming, filters]);
  const savedRows = useMemo(
    () =>
      applyFilters(
        scored.filter((row) => {
          const state = engagement?.[row.event.id];
          return state?.saved || (state?.rsvp_status ?? "none") !== "none";
        }),
        { ...filters, sort: "date" },
      ),
    [scored, engagement, filters],
  );
  const goingCount = savedRows.filter(
    (row) => engagement?.[row.event.id]?.rsvp_status === "going",
  ).length;

  const reflectionByEvent = useMemo(() => {
    const map = new Map<string, true>();
    for (const reflection of reflections ?? []) map.set(reflection.event_id, true);
    return map;
  }, [reflections]);

  const onboarded = Boolean(profile?.onboarding_complete && profile?.roadmap_generated);

  if (profileLoading || isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 md:px-8">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        <span className="animate-pop flex size-16 items-center justify-center rounded-3xl bg-warm-gradient text-primary-foreground shadow-lift">
          <Users className="size-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Let's build your plan first</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Network gets good once I know what you're working toward — then I can put the right rooms,
          hackathons and women-in-tech programs in front of you instead of a generic list.
        </p>
        <Button asChild className="mt-7 gap-2">
          <Link to="/">
            <MessageCircleHeart className="size-4" />
            Finish onboarding in chat
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="rounded-3xl bg-warm-gradient p-6 text-primary-foreground shadow-lift md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          <Sparkles className="size-3.5" /> Network
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
          Rooms worth walking into
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/90 md:text-base">
          Pulled from Meetup, Eventbrite, LinkedIn Events, women-in-tech community calendars,
          hackathon platforms and our partner calendar — then ranked against your roadmap
          {home ? ` and your base in ${profile?.location}` : ""}.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge className="rounded-full bg-primary-foreground/15 text-primary-foreground">
            {upcoming.length} upcoming
          </Badge>
          <Badge className="rounded-full bg-primary-foreground/15 text-primary-foreground">
            {savedRows.length} saved
          </Badge>
          <Badge className="rounded-full bg-primary-foreground/15 text-primary-foreground">
            {goingCount} you're going to
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => void refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={isRefetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        </div>
      </header>

      {isError && (
        <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          I couldn't load events just now. Hit refresh — and if it keeps failing, it's on us, not you.
        </p>
      )}

      <Tabs defaultValue="find" className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="find" className="gap-1.5">
            <Compass className="size-4" /> Find events
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5">
            <Heart className="size-4" /> Saved & RSVP'd
          </TabsTrigger>
          <TabsTrigger value="reflect" className="gap-1.5">
            <NotebookPen className="size-4" /> Reflect & log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="find" className="mt-5 space-y-4">
          <EventFilters filters={filters} onChange={setFilters} resultCount={visible.length} />
          {visible.length === 0 ? (
            <EmptyResults onClear={() => setFilters(DEFAULT_FILTERS)} />
          ) : (
            visible.map(({ event, relevance }) => (
              <EventCard
                key={event.id}
                event={event}
                relevance={relevance}
                engagement={engagement?.[event.id]}
                hasReflection={reflectionByEvent.has(event.id)}
                onToggleSave={() => {
                  const saved = !(engagement?.[event.id]?.saved ?? false);
                  toggleSave.mutate(
                    { eventId: event.id, saved },
                    {
                      onSuccess: () => toast.success(saved ? "Saved for later." : "Removed from saved."),
                      onError: () => toast.error("Couldn't save that. Try again?"),
                    },
                  );
                }}
                onRsvp={(status: RsvpStatus) =>
                  setRsvp.mutate(
                    { eventId: event.id, status, saved: engagement?.[event.id]?.saved ?? false },
                    {
                      onSuccess: () =>
                        toast.success(
                          status === "going"
                            ? "You're going. Saved to your list too."
                            : status === "interested"
                              ? "Marked as interested."
                              : "RSVP cleared.",
                        ),
                      onError: () => toast.error("Couldn't update your RSVP."),
                    },
                  )
                }
                onDownloadIcs={() => downloadIcs([event], "ada-event.ics")}
                onReflect={() => setReflectOn(event)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-warm">
            <CalendarHeart className="size-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm leading-relaxed">
              Export everything you've saved or RSVP'd to as one calendar file, then import it into
              Google or Outlook.
              <span className="block text-xs text-muted-foreground">
                Direct Google/Outlook sync needs you to authorise a calendar account — that connection
                isn't set up in this app yet, so .ics is the honest route.
              </span>
            </p>
            <Button
              className="gap-1.5"
              disabled={savedRows.length === 0}
              onClick={() => {
                downloadIcs(
                  savedRows.map((row) => row.event),
                  "ada-network.ics",
                );
                toast.success("Calendar file downloaded.");
              }}
            >
              <CalendarPlus className="size-4" />
              Export .ics
            </Button>
          </div>

          {savedRows.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
              Nothing saved yet. Tap the heart on anything that looks like your kind of room.
            </p>
          ) : (
            savedRows.map(({ event, relevance }) => (
              <EventCard
                key={event.id}
                event={event}
                relevance={relevance}
                engagement={engagement?.[event.id]}
                hasReflection={reflectionByEvent.has(event.id)}
                onToggleSave={() =>
                  toggleSave.mutate({ eventId: event.id, saved: false }, {
                    onSuccess: () => toast.success("Removed from saved."),
                  })
                }
                onRsvp={(status: RsvpStatus) =>
                  setRsvp.mutate({
                    eventId: event.id,
                    status,
                    saved: engagement?.[event.id]?.saved ?? false,
                  })
                }
                onDownloadIcs={() => downloadIcs([event], "ada-event.ics")}
                onReflect={() => setReflectOn(event)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reflect" className="mt-5 space-y-4">
          {(reflections ?? []).length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-5 shadow-warm">
              <h2 className="font-display text-xl font-semibold">What you've been to</h2>
              <ul className="mt-3 space-y-3">
                {(reflections ?? []).map((reflection) => {
                  const event = events?.find((row) => row.id === reflection.event_id);
                  return (
                    <li key={reflection.id} className="rounded-2xl bg-secondary/60 px-4 py-3">
                      <p className="text-sm font-semibold">{event?.title ?? "Event"}</p>
                      {reflection.takeaway && (
                        <p className="mt-1 text-sm text-muted-foreground">“{reflection.takeaway}”</p>
                      )}
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {reflection.attended ? "Attended" : "Didn't make it"}
                        {reflection.rating ? ` · rated ${reflection.rating}/5` : ""}
                        {reflection.contacts.length > 0
                          ? ` · met ${reflection.contacts.join(", ")}`
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Ready to log</h2>
            {past.length === 0 && savedRows.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
                Once you've been to something, come back here and tell me how it went.
              </p>
            ) : (
              [...past, ...savedRows.filter((row) => !past.some((p) => p.event.id === row.event.id))]
                .slice(0, 12)
                .map(({ event }) => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatEventDate(event.starts_at)}</p>
                    </div>
                    <Button
                      variant={reflectionByEvent.has(event.id) ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => setReflectOn(event)}
                    >
                      {reflectionByEvent.has(event.id) ? "Add another note" : "Reflect"}
                    </Button>
                  </div>
                ))
            )}
          </section>
        </TabsContent>
      </Tabs>

      <ReflectionDialog
        event={reflectOn}
        roadmapSkills={roadmapSkills}
        open={reflectOn !== null}
        onOpenChange={(open) => {
          if (!open) setReflectOn(null);
        }}
      />

      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Events come from a seeded ingestion layer with source attribution, refreshed on a schedule.
        Live partner APIs plug into the same pipeline once their access is configured.
      </p>
    </div>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
      <Loader2 className="mx-auto hidden" />
      <h2 className="font-display text-xl font-semibold">Nothing matches those filters</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Try widening the date range or letting virtual events back in — plenty of good rooms are online.
      </p>
      <Button variant="outline" className="mt-5" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
