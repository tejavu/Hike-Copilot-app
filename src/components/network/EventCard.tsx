import {
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  NotebookPen,
  Sparkles,
  Ticket,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_LABELS,
  FORMAT_LABELS,
  cohortInitials,
  formatEventDate,
  googleCalendarUrl,
  outlookCalendarUrl,
  type EventEngagement,
  type NetworkEvent,
  type Relevance,
  type RsvpStatus,
} from "@/lib/events";

export function EventCard({
  event,
  relevance,
  engagement,
  hasReflection,
  onToggleSave,
  onRsvp,
  onDownloadIcs,
  onReflect,
}: {
  event: NetworkEvent;
  relevance: Relevance;
  engagement: EventEngagement | undefined;
  hasReflection: boolean;
  onToggleSave: () => void;
  onRsvp: (status: RsvpStatus) => void;
  onDownloadIcs: () => void;
  onReflect: () => void;
}) {
  const saved = engagement?.saved ?? false;
  const rsvp = engagement?.rsvp_status ?? "none";
  const initials = cohortInitials(event);
  const past = new Date(event.starts_at).getTime() < Date.now();

  return (
    <article
      className={cn(
        "rounded-3xl border border-border bg-card p-5 shadow-warm transition-shadow hover:shadow-lift",
        rsvp === "going" && "border-primary/50",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {EVENT_TYPE_LABELS[event.event_type]}
            </Badge>
            {relevance.reason && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-gradient px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Sparkles className="size-3" />
                {relevance.reason}
              </span>
            )}
          </div>
          <h3 className="mt-2.5 font-display text-xl leading-snug font-semibold">{event.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.organizer} · via {event.source}
          </p>
        </div>

        <Button
          variant={saved ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this event"}
          onClick={onToggleSave}
        >
          <Heart className={cn("size-4", saved && "fill-current")} />
          {saved ? "Saved" : "Save"}
        </Button>
      </div>

      {event.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
      )}

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" />
          <span>{formatEventDate(event.starts_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {event.format === "virtual" ? (
            <Video className="size-4 shrink-0 text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span>
            {event.format === "virtual"
              ? "Online"
              : [event.city, event.country].filter(Boolean).join(", ") || "Online"}
            {relevance.distance != null && (
              <span className="text-muted-foreground"> · ~{relevance.distance} km away</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Ticket className="size-4 shrink-0 text-primary" />
          <span>{event.price_text ?? (event.cost === "free" ? "Free" : "Paid")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span>{FORMAT_LABELS[event.format]}</span>
        </div>
      </dl>

      {event.skill_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {event.skill_tags.map((tag) => {
            const matched = relevance.matchedSkills.includes(tag);
            return (
              <Badge
                key={tag}
                variant={matched ? "default" : "outline"}
                className="rounded-full font-normal"
              >
                {tag}
              </Badge>
            );
          })}
        </div>
      )}

      {event.cohort_going > 0 && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-secondary/70 px-3 py-2">
          <div className="flex -space-x-2" aria-hidden="true">
            {initials.map((initial, i) => (
              <span
                key={i}
                className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-plum text-xs font-semibold text-plum-foreground"
              >
                {initial}
              </span>
            ))}
          </div>
          <p className="text-xs text-secondary-foreground">
            <Users className="mr-1 inline size-3.5" />
            {event.cohort_going} in the Ada cohort are interested
            <span className="text-muted-foreground"> · demo cohort activity</span>
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={rsvp} onValueChange={(value) => onRsvp(value as RsvpStatus)}>
          <SelectTrigger className="w-[168px] bg-background" aria-label="Your RSVP">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No RSVP yet</SelectItem>
            <SelectItem value="interested">I'm interested</SelectItem>
            <SelectItem value="going">I'm going</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarPlus className="size-4" />
              Add to calendar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel>Put it in your calendar</DropdownMenuLabel>
            <DropdownMenuItem onClick={onDownloadIcs}>Download .ics file</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">
                Open in Google Calendar
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={outlookCalendarUrl(event)} target="_blank" rel="noreferrer">
                Open in Outlook Calendar
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
              These add one event at a time. Continuous two-way sync needs you to connect a Google or
              Outlook account — not configured yet.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        {(past || rsvp !== "none" || saved) && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onReflect}>
            {hasReflection ? <Check className="size-4 text-success" /> : <NotebookPen className="size-4" />}
            {hasReflection ? "Reflection logged" : "Reflect on it"}
          </Button>
        )}

        <Button variant="ghost" size="sm" className="ml-auto gap-1.5" asChild>
          <a href={event.url} target="_blank" rel="noreferrer">
            Event page
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </article>
  );
}
