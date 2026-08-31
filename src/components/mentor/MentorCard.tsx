import { BadgeCheck, CalendarClock, Globe, Heart, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  MEETING_PREF_LABELS,
  initialsOf,
  type MatchResult,
  type MatchStatus,
} from "@/lib/mentors";

export function MentorAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warm-gradient font-display text-base font-semibold text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function MentorCard({
  result,
  status,
  showMatch = true,
  onOpen,
  onShortlist,
  onSelect,
}: {
  result: MatchResult;
  status: MatchStatus | undefined;
  showMatch?: boolean;
  onOpen: () => void;
  onShortlist: () => void;
  onSelect: () => void;
}) {
  const { mentor, score, reasons, matchedAttributes, distance } = result;
  const shortlisted = status === "shortlisted" || status === "selected";

  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-lift">
      <div className="flex items-start gap-3">
        <MentorAvatar name={mentor.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-semibold">{mentor.full_name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {mentor.title} · {mentor.company}
              </p>
            </div>
            {showMatch && (
              <div className="shrink-0 text-right">
                <p className="font-display text-xl font-semibold text-primary">{score}%</p>
                <p className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">match</p>
              </div>
            )}
          </div>
          {showMatch && <Progress value={score} className="mt-2 h-1.5" />}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {mentor.city ? `${mentor.city}${mentor.country ? `, ${mentor.country}` : ""}` : "Remote only"}
          {distance != null && distance <= 400 ? ` · ${distance} km` : ""}
        </span>
        <span className="inline-flex items-center gap-1">
          <Globe className="size-3.5" />
          {mentor.languages.join(", ")}
        </span>
        <span className="inline-flex items-center gap-1">
          <BadgeCheck className="size-3.5" />
          {MEETING_PREF_LABELS[mentor.meeting_pref]}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground/80">{mentor.bio}</p>

      {showMatch && reasons.length > 0 && (
        <div className="mt-3 rounded-2xl bg-accent/50 p-3">
          <p className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
            Why you match
          </p>
          <ul className="mt-1.5 space-y-1">
            {reasons.slice(0, 2).map((reason) => (
              <li key={reason} className="flex gap-1.5 text-xs leading-relaxed text-accent-foreground">
                <Star className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(showMatch && matchedAttributes.length ? matchedAttributes : mentor.expertise)
          .slice(0, 5)
          .map((tag) => (
            <Badge key={tag} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" />
        {mentor.availability_summary}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" onClick={onSelect} className="gap-1.5">
          <Heart className="size-3.5" />
          {status === "selected" ? "Your mentor" : "Choose her"}
        </Button>
        <Button size="sm" variant={shortlisted ? "secondary" : "outline"} onClick={onShortlist}>
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          Full profile
        </Button>
      </div>
    </article>
  );
}
