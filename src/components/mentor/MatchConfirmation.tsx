import { CalendarClock, Globe, Heart, Loader2, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MentorAvatar } from "@/components/mentor/MentorCard";
import {
  MEETING_PREF_LABELS,
  formatSlot,
  preferredSlots,
  type MatchResult,
  type TimeOfDay,
} from "@/lib/mentors";

/**
 * The mentee doesn't shop around: Hike Copilot picks one best-fit mentor and explains
 * why. She confirms, then books a session.
 */
export function MatchConfirmation({
  result,
  timeOfDay,
  confirming,
  onConfirm,
  onViewProfile,
}: {
  result: MatchResult;
  timeOfDay: TimeOfDay | null;
  confirming: boolean;
  onConfirm: () => void;
  onViewProfile: () => void;
}) {
  const { mentor, score, reasons, matchedAttributes } = result;
  const slots = preferredSlots(mentor, timeOfDay);
  const first = mentor.full_name.split(" ")[0];

  return (
    <section
      aria-label="Your matched mentor"
      className="rounded-3xl border border-border bg-card p-6 shadow-lift md:p-8"
    >
      <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
        <Heart className="size-3.5" />
        Your match
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold md:text-3xl">
        I've found the person I'd want in your corner
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Based on what you told me and what's on your roadmap, {first} is the strongest fit in the
        volunteer directory right now. Read why, then confirm.
      </p>

      <div className="mt-6 flex flex-wrap items-start gap-4 rounded-3xl border border-border bg-accent/30 p-5">
        <MentorAvatar name={mentor.full_name} className="size-16" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-semibold">{mentor.full_name}</h3>
          <p className="text-sm text-muted-foreground">
            {mentor.title} · {mentor.company} · {mentor.years_experience} years in{" "}
            {mentor.role_track}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{mentor.bio}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {mentor.city
                ? `${mentor.city}${mentor.country ? `, ${mentor.country}` : ""}`
                : "Remote only"}
              {" · "}
              {MEETING_PREF_LABELS[mentor.meeting_pref]}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-3.5" />
              {mentor.languages.join(", ")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {mentor.availability_summary}
            </span>
          </div>
        </div>
        <div className="w-full sm:w-44">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Compatibility
            </p>
            <p className="font-display text-2xl font-semibold text-primary">{score}%</p>
          </div>
          <Progress value={score} className="mt-2 h-1.5" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h4 className="font-display text-lg font-semibold">Why you match</h4>
          <ul className="mt-2 space-y-2">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-sm leading-relaxed">
                <Star className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {matchedAttributes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {matchedAttributes.map((attribute) => (
                <Badge key={attribute} variant="secondary" className="font-normal">
                  {attribute}
                </Badge>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            That percentage is a compatibility guide built from the preferences you gave me — skills,
            target role, language, format and when you're free. It isn't a prediction of how the
            relationship will go.
          </p>
        </div>

        <div className="rounded-2xl border border-border p-4">
          <h4 className="font-display text-lg font-semibold">When you could meet</h4>
          {slots.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              She hasn't published openings for the next few weeks. Confirm her anyway and I'll
              watch for times.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {slots.slice(0, 4).map((slot) => (
                <li key={slot.start.toISOString()} className="inline-flex items-center gap-2">
                  <CalendarClock className="size-3.5 text-primary" />
                  {formatSlot(slot.start)} · {slot.minutes} min
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            These fit the availability you gave me. You'll pick the exact time on the next step.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button className="gap-2" disabled={confirming} onClick={onConfirm}>
          {confirming ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
          Confirm {first} and pick a time
        </Button>
        <Button variant="ghost" onClick={onViewProfile}>
          See her full profile
        </Button>
      </div>
      {mentor.is_demo && (
        <p className="mt-4 rounded-2xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          Demo profile — a clearly-labelled stand-in so the whole mentoring flow works end to end,
          not a real person waiting for your message.
        </p>
      )}
    </section>
  );
}
