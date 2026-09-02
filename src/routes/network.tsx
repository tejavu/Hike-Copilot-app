import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { NetworkView } from "@/components/network/NetworkView";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Network — events worth your evening | Hike Copilot" },
      {
        name: "description",
        content:
          "Hackathons, workshops, mixers and women-in-tech programs ranked against your roadmap and your city — save, RSVP, sync to your calendar and log what you learned.",
      },
      { property: "og:title", content: "Network — events worth your evening | Hike Copilot" },
      {
        property: "og:description",
        content:
          "Events ranked against your skill gaps and your city, with saves, RSVPs, calendar export and post-event reflections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <AuthGate>
      <AppShell>
        <NetworkView />
      </AppShell>
    </AuthGate>
  );
}
