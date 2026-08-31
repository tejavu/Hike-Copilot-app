import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2, Star } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSaveReflection } from "@/hooks/useNetworkData";
import type { NetworkEvent } from "@/lib/events";

export function ReflectionDialog({
  event,
  roadmapSkills,
  open,
  onOpenChange,
}: {
  event: NetworkEvent | null;
  roadmapSkills: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [attended, setAttended] = useState(true);
  const [contacts, setContacts] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [metSomeone, setMetSomeone] = useState(false);
  const save = useSaveReflection();

  useEffect(() => {
    if (open) {
      setAttended(true);
      setContacts("");
      setTakeaway("");
      setRating(null);
      setMetSomeone(false);
    }
  }, [open, event?.id]);

  if (!event) return null;

  const contactList = contacts
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const submit = () => {
    save.mutate(
      { event, attended, contacts: contactList, takeaway, rating, roadmapSkills },
      {
        onSuccess: (result) => {
          toast.success(
            attended
              ? result.loggedSkill
                ? `Logged. Added a visibility milestone under ${result.loggedSkill}.`
                : "Logged — proud of you for showing up."
              : "Noted. Plans change; no guilt here.",
          );
          if (contactList.length > 0) setMetSomeone(true);
          else onOpenChange(false);
        },
        onError: () => toast.error("That didn't save. Try once more?"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {metSomeone ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                You met {contactList.length === 1 ? contactList[0] : `${contactList.length} new people`}.
              </DialogTitle>
              <DialogDescription>
                That's how careers actually move — one real conversation at a time. Want to keep the
                momentum and get paired with someone further along in your target field?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button asChild className="gap-2">
                <Link to="/mentor-match" onClick={() => onOpenChange(false)}>
                  <Heart className="size-4" />
                  Try Mentor Match
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Maybe later
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">How was it?</DialogTitle>
              <DialogDescription>
                {event.title} — a couple of lines is plenty. This feeds a visibility milestone on your
                roadmap (exposure, not a proficiency claim).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/50 px-4 py-3">
                <Label htmlFor="attended" className="text-sm font-medium">
                  I made it there
                </Label>
                <Switch id="attended" checked={attended} onCheckedChange={setAttended} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contacts">Who did you meet?</Label>
                <Input
                  id="contacts"
                  value={contacts}
                  onChange={(event_) => setContacts(event_.target.value)}
                  placeholder="First names, separated by commas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="takeaway">One thing you're taking away</Label>
                <Textarea
                  id="takeaway"
                  value={takeaway}
                  onChange={(event_) => setTakeaway(event_.target.value)}
                  placeholder="Even 'the room was friendlier than I expected' counts."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Worth your evening?</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} out of 5`}
                      aria-pressed={rating === value}
                      onClick={() => setRating(value)}
                      className="rounded-full p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Star
                        className={cn(
                          "size-6 transition-colors",
                          rating != null && value <= rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={save.isPending} className="gap-2">
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                Save reflection
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
