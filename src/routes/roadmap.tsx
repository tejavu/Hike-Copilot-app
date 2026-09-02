import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { RoadmapView } from "@/components/roadmap/RoadmapView";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "My Roadmap — Hike Copilot" },
      {
        name: "description",
        content:
          "One connected journey: learn each missing skill, build proof of it, then apply — with visible progress the whole way.",
      },
      { property: "og:title", content: "My Roadmap — Hike Copilot" },
      {
        property: "og:description",
        content: "Learn it, build it, apply for it. Your skill gaps turned into a plan you can actually follow.",
      },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  return (
    <AuthGate>
      <AppShell>
        <RoadmapView />
      </AppShell>
    </AuthGate>
  );
}
