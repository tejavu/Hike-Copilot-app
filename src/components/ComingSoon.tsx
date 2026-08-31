import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  tagline,
  body,
}: {
  icon: LucideIcon;
  title: string;
  tagline: string;
  body: string;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center md:min-h-screen">
      <span className="animate-pop flex size-16 items-center justify-center rounded-3xl bg-warm-gradient text-primary-foreground shadow-lift">
        <Icon className="size-7" />
      </span>
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 font-display text-xl text-primary">{tagline}</p>
      <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold tracking-wide uppercase shadow-warm">
        <Sparkles className="size-3.5 text-primary" /> Coming soon
      </p>
      <p className="mt-6 max-w-md text-sm text-muted-foreground">
        In the meantime, your roadmap is where the momentum lives — and I'm always in chat if you want to talk it
        through.
      </p>
    </div>
  );
}
