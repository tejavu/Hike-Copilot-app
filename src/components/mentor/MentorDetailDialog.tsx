import { BadgeCheck, CalendarClock, Globe, Heart, MapPin, Star, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MentorAvatar } from "@/components/mentor/MentorCard";
import {
  MEETING_PREF_LABELS,
  formatSlot,
  upcomingSlots,
  type MatchResult,
  type MatchStatus,
} from "@/lib/mentors";

export function MentorDetailDialog({
  result,
  status,
  open,
  onOpenChange,
  onShortlist,
  onSelect,
}: {
  result: MatchResult | null;
  status: MatchStatus | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShortlist: () => void;
  onSelect: () => void;
}) {
  if (!result) return null;
  const { mentor, score, reasons, matchedAttributes } = result;
  const slots = upcomingSlots(mentor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <MentorAvatar name={mentor.full_name} className="size-14" />
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="font-display text-2xl">{mentor.full_name}</DialogTitle>
              <DialogDescription>
                {mentor.title} · {mentor.company} · {mentor.years_experience} years in{" "}
                {mentor.role_track}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-accent/40 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
                Compatibility guide
              </p>
              <p className="font-display text-2xl font-semibold text-primary">{score}%</p>
            </div>
            <Progress value={score} className="mt-2 h-1.5" />
            <ul className="mt-3 space-y-1.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm leading-relaxed text-accent-foreground">
                  <Star className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              This percentage is a compatibility guide built from the preferences you gave me — skills,
              target role, language, format and availability. It isn't a prediction of how the relationship
              will go.
            </p>
          </div>

          <p className="text-sm leading-relaxed">{mentor.bio}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Expertise">
              <div className="flex flex-wrap gap-1.5">
                {mentor.expertise.map((skill) => (
                  <Badge
                    key={skill}
                    variant={matchedAttributes.includes(skill) ? "default" : "secondary"}
                    className="font-normal"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </Detail>
            <Detail label="Mentoring topics">
              <div className="flex flex-wrap gap-1.5">
                {mentor.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="font-normal">
                    {topic}
                  </Badge>
                ))}
              </div>
            </Detail>
            <Detail label="Location & format">
              <p className="inline-flex items-center gap-1.5 text-sm">
                <MapPin className="size-3.5" />
                {mentor.city ? `${mentor.city}${mentor.country ? `, ${mentor.country}` : ""}` : "Remote only"}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
                <BadgeCheck className="size-3.5" />
                {MEETING_PREF_LABELS[mentor.meeting_pref]}
              </p>
            </Detail>
            <Detail label="Languages & seniority">
              <p className="inline-flex items-center gap-1.5 text-sm">
                <Globe className="size-3.5" />
                {mentor.languages.join(", ")}
              </p>
              <p className="mt-1 text-sm">{mentor.seniority} level</p>
            </Detail>
            <Detail label="Availability">
              <p className="inline-flex items-center gap-1.5 text-sm">
                <CalendarClock className="size-3.5" />
                {mentor.availability_summary}
              </p>
              {slots.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next opening: {formatSlot(slots[0]!.start)}
                </p>
              )}
            </Detail>
            {mentor.community && (
              <Detail label="Community">
                <p className="inline-flex items-center gap-1.5 text-sm">
                  <Users className="size-3.5" />
                  {mentor.community}
                </p>
              </Detail>
            )}
          </div>

          {mentor.is_demo && (
            <p className="rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Demo profile. This is a realistic stand-in used to build out the mentoring flow — not a real
              person you'd be emailing yet.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button className="gap-2" onClick={onSelect}>
            <Heart className="size-4" />
            {status === "selected" ? "Your mentor" : "Choose her as my mentor"}
          </Button>
          <Button variant="outline" onClick={onShortlist}>
            {status === "shortlisted" || status === "selected" ? "Shortlisted" : "Shortlist for later"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
