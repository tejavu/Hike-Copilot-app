import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { MentorMatchView } from "@/components/mentor/MentorMatchView";

export const Route = createFileRoute("/mentor-match")({
  head: () => ({
    meta: [
      { title: "Mentor Match — someone who's walked it | Ada" },
      {
        name: "description",
        content:
          "Get matched with volunteer mentors in tech based on your goal, roadmap skill gaps, language and availability — then book sessions, prep good questions and track what you agreed to do.",
      },
      { property: "og:title", content: "Mentor Match — someone who's walked it | Ada" },
      {
        property: "og:description",
        content:
          "Explainable mentor matching, session scheduling with calendar export, AI-prepped questions and a follow-up action plan wired into your roadmap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MentorMatchPage,
});

function MentorMatchPage() {
  return (
    <AuthGate>
      <AppShell>
        <MentorMatchView />
      </AppShell>
    </AuthGate>
  );
}
