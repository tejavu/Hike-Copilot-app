import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Network — Ada" },
      {
        name: "description",
        content: "Soon: connect with other women in tech walking the same path, at the same stage, in your field.",
      },
      { property: "og:title", content: "Network — Ada" },
      {
        property: "og:description",
        content: "Soon: connect with other women in tech walking the same path as you.",
      },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <AuthGate>
      <AppShell>
        <ComingSoon
          icon={Users}
          title="Network"
          tagline="Because nobody does this alone."
          body="Soon you'll be able to find other women in tech who are working toward the same kind of role — swap notes, share what worked, and have people in your corner who genuinely get it."
        />
      </AppShell>
    </AuthGate>
  );
}
