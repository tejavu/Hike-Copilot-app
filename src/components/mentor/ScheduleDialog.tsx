import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatSlot,
  MIN_BOOKING_LEAD_DAYS,
  preferredSlots,
  type Mentor,
  type SessionSlot,
  type TimeOfDay,
} from "@/lib/mentors";


export function ScheduleDialog({
  mentor,
  defaultTheme,
  timeOfDay,
  timezone,
  open,
  onOpenChange,
  saving,
  onConfirm,
}: {
  mentor: Mentor | null;
  defaultTheme: string;
  timeOfDay?: TimeOfDay | null;
  timezone?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onConfirm: (input: { slot: SessionSlot; theme: string; format: string }) => void;
}) {
  const [selected, setSelected] = useState<number>(0);
  const [theme, setTheme] = useState(defaultTheme);
  const [format, setFormat] = useState<string>("remote");

  const slots = useMemo(
    () => (mentor ? preferredSlots(mentor, timeOfDay ?? "any") : []),
    [mentor, timeOfDay],
  );

  useEffect(() => {
    if (open) {
      setSelected(0);
      setTheme(defaultTheme);
      setFormat(mentor?.meeting_pref === "in_person" ? "in_person" : "remote");
    }
  }, [open, defaultTheme, mentor?.id, mentor?.meeting_pref]);

  if (!mentor) return null;
  const canMeetInPerson = mentor.meeting_pref !== "remote";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Book time with {mentor.full_name.split(" ")[0]}
          </DialogTitle>
          <DialogDescription>
            These are the windows she keeps open for mentoring:{" "}
            {mentor.availability_summary.toLowerCase()}
            {timezone ? `. Times shown in ${timezone}` : ""}. Sessions are booked at least{" "}
            {MIN_BOOKING_LEAD_DAYS} days ahead so she has time to prepare.
          </DialogDescription>

        </DialogHeader>

        {slots.length === 0 ? (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            She hasn't published any openings for the next few weeks. I'll keep watching for times —
            or ask me to match you with someone else.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pick a time
              </Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {slots.map((slot, index) => {
                  const active = index === selected;
                  return (
                    <button
                      key={slot.start.toISOString()}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(index)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-accent/60",
                      )}
                    >
                      <span>
                        <span className="block font-medium">{formatSlot(slot.start)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {slot.minutes} min
                        </span>
                      </span>
                      {active && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-theme">What's this session about?</Label>
              <Input
                id="session-theme"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder="e.g. Honest review of my portfolio before I start applying"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-format">How will you meet?</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="session-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Online video call</SelectItem>
                  {canMeetInPerson && <SelectItem value="in_person">In person</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-border bg-accent/40 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent-foreground">
                <Video className="size-4" />
                Microsoft Teams
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-accent-foreground">
                Hike Copilot can't create a Teams meeting for you yet — that needs you to authorise Microsoft
                365 so a meeting can be booked in your calendar on your behalf. Until you connect
                it, I'll give you a calendar file (.ics) to add the session anywhere, and your
                mentor can drop the Teams link into it.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-2 bg-card"
                onClick={() =>
                  toast.info("Microsoft Teams isn't connected", {
                    description:
                      "Connecting Teams requires Microsoft 365 authorisation, which isn't set up for this app yet. Your .ics download works right now.",
                  })
                }
              >
                <Video className="size-3.5" />
                Connect Microsoft Teams
              </Button>
              <p className="mt-2 text-[0.7rem] tracking-wide text-muted-foreground uppercase">
                Not connected
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            className="gap-2"
            disabled={slots.length === 0 || saving}
            onClick={() => {
              const slot = slots[selected];
              if (!slot) return;
              onConfirm({ slot, theme: theme.trim() || defaultTheme, format });
            }}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Confirm session
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
