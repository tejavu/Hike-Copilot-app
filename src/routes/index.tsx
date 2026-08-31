import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ChatView } from "@/components/chat/ChatView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ada — Your Career Coach for Women in Tech" },
      {
        name: "description",
        content:
          "Ada is a warm AI career coach for women in tech: find your skill gaps, close them with a real roadmap, and land the role.",
      },
      { property: "og:title", content: "Ada — Your Career Coach for Women in Tech" },
      {
        property: "og:description",
        content: "Find your skill gaps, close them with a guided roadmap, and land the role. One step at a time.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AuthGate>
      <AppShell>
        <ChatView />
      </AppShell>
    </AuthGate>
  );
}
