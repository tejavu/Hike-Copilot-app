import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/mentor-match")({
  head: () => ({
    meta: [
      { title: "Mentor Match — Ada" },
      {
        name: "description",
        content: "Soon: get paired with a mentor already working in the field you're moving toward.",
      },
      { property: "og:title", content: "Mentor Match — Ada" },
      {
        property: "og:description",
        content: "Soon: get paired with a mentor already doing the job you're working toward.",
      },
    ],
  }),
  component: MentorMatchPage,
});

function MentorMatchPage() {
  return (
    <AuthGate>
      <AppShell>
        <ComingSoon
          icon={Heart}
          title="Mentor Match"
          tagline="Someone who's already walked it."
          body="Soon we'll pair you with a mentor working in your target field — someone who can look at your roadmap, tell you what actually matters, and remind you that they felt this way once too."
        />
      </AppShell>
    </AuthGate>
  );
}
