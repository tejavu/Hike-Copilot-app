import { useEffect, useState } from "react";
import { Loader2, MessageCircleHeart, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatSlot, type MentorSession, type SessionFeedback } from "@/lib/mentors";

export type FeedbackDraft = {
  attended: boolean;
  rating: number | null;
  helpful: string;
  comments: string;
  continueWithMentor: boolean;
  followupRequest: string;
};

/** Simple, warm post-session prompt: did it happen, was it useful, what next. */
export function SessionFeedbackDialog({
  session,
  mentorName,
  existing,
  open,
  saving,
  onOpenChange,
  onSubmit,
}: {
  session: MentorSession | null;
  mentorName: string;
  existing: SessionFeedback | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: FeedbackDraft) => void;
}) {
  const [draft, setDraft] = useState<FeedbackDraft>({
    attended: true,
    rating: null,
    helpful: "",
    comments: "",
    continueWithMentor: true,
    followupRequest: "",
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      attended: existing?.attended ?? true,
      rating: existing?.rating ?? null,
      helpful: existing?.helpful ?? "",
      comments: existing?.comments ?? "",
      continueWithMentor: existing?.continue_with_mentor ?? true,
      followupRequest: existing?.followup_request ?? "",
    });
  }, [open, existing?.id]);

  if (!session) return null;
  const first = mentorName.split(" ")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2 font-display text-2xl">
            <MessageCircleHeart className="size-5 text-primary" />
            How did it go with {first}?
          </DialogTitle>
          <DialogDescription>
            {formatSlot(session.starts_at)} · this stays private to you and shapes what I suggest
            next.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <Label htmlFor="fb-attended" className="text-sm font-medium">
              Did the session happen?
            </Label>
            <Switch
              id="fb-attended"
              checked={draft.attended}
              onCheckedChange={(checked) => setDraft({ ...draft, attended: checked })}
            />
          </div>

          {draft.attended && (
            <>
              <div>
                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  How useful was it?
                </Label>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = (draft.rating ?? 0) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} out of 5`}
                        aria-pressed={draft.rating === value}
                        onClick={() => setDraft({ ...draft, rating: value })}
                        className={cn(
                          "rounded-xl border p-2 transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent/60",
                        )}
                      >
                        <Star className={cn("size-4", active && "fill-current")} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fb-helpful">What was most helpful?</Label>
                <Textarea
                  id="fb-helpful"
                  rows={3}
                  value={draft.helpful}
                  onChange={(event) => setDraft({ ...draft, helpful: event.target.value })}
                  placeholder="e.g. She showed me exactly which two projects to lead with"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="fb-comments">Anything else you want to remember? (optional)</Label>
            <Textarea
              id="fb-comments"
              rows={3}
              value={draft.comments}
              onChange={(event) => setDraft({ ...draft, comments: event.target.value })}
              placeholder="Honest thoughts — good or awkward"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <Label htmlFor="fb-continue" className="text-sm font-medium">
              Do you want to keep working with {first}?
            </Label>
            <Switch
              id="fb-continue"
              checked={draft.continueWithMentor}
              onCheckedChange={(checked) => setDraft({ ...draft, continueWithMentor: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fb-followup">
              {draft.continueWithMentor
                ? "What would you like from the next session?"
                : "What would you want from a different mentor?"}
            </Label>
            <Textarea
              id="fb-followup"
              rows={2}
              value={draft.followupRequest}
              onChange={(event) => setDraft({ ...draft, followupRequest: event.target.value })}
              placeholder="e.g. A mock interview, or someone closer to data engineering"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button className="gap-2" disabled={saving} onClick={() => onSubmit(draft)}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save my feedback
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
