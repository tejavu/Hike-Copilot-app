import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/mentors";

/**
 * Mentor initials badge. Ada selects one best-fit mentor rather than showing a
 * browsable grid, so there is no longer a selectable mentor card.
 */
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
