import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  Heart,
  Lock,
  LogOut,
  Map as MapIcon,
  Menu,
  MessageCircleHeart,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useProfile } from "@/hooks/useCoachData";
import { useCreateThread, useThreads } from "@/hooks/useChatThreads";
import { useAuth } from "@/hooks/useAuth";
import { CvDialog } from "@/components/cv/CvDialog";
import copilotLogo from "@/assets/copilot-logo.png";

type NavItem = {
  to: "/" | "/roadmap" | "/network" | "/mentor-match";
  label: string;
  icon: typeof MapIcon;
  gated: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "AI Chat", icon: MessageCircleHeart, gated: false },
  { to: "/roadmap", label: "Roadmap", icon: MapIcon, gated: true },
  { to: "/network", label: "Network", icon: Users, gated: true },
  { to: "/mentor-match", label: "Mentor Match", icon: Heart, gated: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarBody onNavigate={() => undefined} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-display text-lg font-semibold">Hike Copilot</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  const { data: profile } = useProfile();
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const unlocked = Boolean(profile?.onboarding_complete && profile?.roadmap_generated);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <img
            src={copilotLogo}
            alt="Hike Copilot logo"
            width={816}
            height={816}
            className="size-9 shrink-0 object-contain"
          />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-sidebar-foreground">Hike Copilot</p>
            <p className="text-xs text-muted-foreground">your career coach</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const locked = item.gated && !unlocked;
          const active = pathname === item.to;
          const Icon = item.icon;

          if (locked) {
            return (
              <div
                key={item.to}
                aria-disabled="true"
                title="Unlocks once your roadmap is ready"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60 select-none"
              >
                <Icon className="size-4.5" />
                <span className="flex-1">{item.label}</span>
                <Lock className="size-3.5" />
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {!unlocked && (
        <p className="mx-3 mb-3 rounded-xl bg-sidebar-accent/50 px-3 py-2.5 text-xs leading-relaxed text-sidebar-accent-foreground">
          Roadmap, Network and Mentor Match open up as soon as we've built your plan together in chat.
        </p>
      )}

      <div className="mt-auto space-y-2 border-t border-sidebar-border px-3 py-4">
        <CvDialog>
          <Button variant="outline" className="w-full justify-start gap-2.5 bg-card" onClick={onNavigate}>
            <FileText className="size-4" />
            My CV
          </Button>
        </CvDialog>
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
