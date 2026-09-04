import { useState } from "react";
import { Check, ChevronDown, Heart, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/domain";

/**
 * Shows every role she found in one scannable list, so she can read the whole
 * set before deciding on any of them. Tapping a title opens the full detail.
 */
export function JobPicker({
  jobs,
  busy,
  onDecide,
}: {
  jobs: Job[];
  busy: boolean;
  onDecide: (job: Job, liked: boolean) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="animate-pop divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
      {jobs.map((job) => {
        const open = openId === job.id;
        return (
          <div key={job.id} className={cn(job.liked === false && "opacity-55")}>
            <div className="flex items-start gap-3 p-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : job.id)}
                className="min-w-0 flex-1 text-left"
                aria-expanded={open}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-display truncate text-sm font-semibold">{job.title}</span>
                  <ChevronDown
                    className={cn("size-3.5 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
                  />
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {[job.company, job.location, job.seniority].filter(Boolean).join(" · ")}
                </span>
              </button>
              {job.liked === null ? (
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy}
                    onClick={() => void onDecide(job, false)}
                  >
                    <X className="size-3.5" /> Pass
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => void onDecide(job, true)}>
                    <Heart className="size-3.5" /> Keep
                  </Button>
                </div>
              ) : (
                <Badge variant={job.liked ? "default" : "outline"} className="shrink-0 gap-1">
                  {job.liked ? <Check className="size-3" /> : <X className="size-3" />}
                  {job.liked ? "Kept" : "Passed"}
                </Badge>
              )}
            </div>
            {open && (
              <div className="border-t border-border/60 bg-secondary/30 px-4 py-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.required_skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="bg-card">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {job.is_example ? (
                    <Badge variant="outline" className="border-dashed">
                      Example role — not a live posting
                    </Badge>
                  ) : (
                    job.source && <span>Found on {job.source}</span>
                  )}
                  {job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      View the original posting
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
