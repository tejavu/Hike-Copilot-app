import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ThreadChatView } from "@/components/chat/ThreadChatView";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Hike Copilot" },
      {
        name: "description",
        content: "A side conversation with your Hike Copilot career coach about roles, skills and next steps.",
      },
      { property: "og:title", content: "Chat — Hike Copilot" },
      {
        property: "og:description",
        content: "Ask your career coach anything — roles, skills, interviews and roadmap next steps.",
      },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return (
    <AuthGate>
      <AppShell>
        <ThreadChatView key={threadId} threadId={threadId} />
      </AppShell>
    </AuthGate>
  );
}
