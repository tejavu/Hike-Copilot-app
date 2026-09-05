# Microsoft-first learning sources

Three changes so that anything cloud- or Microsoft-related points at Microsoft's own learning, adds LinkedIn Learning as a source, and visibly stands out on the roadmap.

## 1. Cloud topics stop pointing at AWS

Right now "cloud", "cloud computing", "cloud services" and "GCP" all quietly redirect to the AWS entry, which is why an "interested in cloud services" answer produced AWS Coursera links.

- Generic cloud wording ("cloud", "cloud computing", "cloud services", "cloud architecture") will route to the Azure entry instead.
- Explicitly naming AWS still gives the AWS entry — nothing curated is removed, competitor content just stops being the default for a neutral request.
- The Microsoft keyword list grows to cover: azure, cloud, .net, c#, power bi, power platform, power automate, github, github actions, github copilot, microsoft 365, dynamics, sharepoint, teams, sql server, entra, intune, visual studio, typescript-on-azure style phrasings, copilot.

## 2. Microsoft topics get Microsoft links everywhere, plus LinkedIn Learning

Today only the *course* link switches to Microsoft Learn; practice and certification still fall back to LeetCode/Exercism/Coursera. For a Microsoft-ecosystem skill the whole step set becomes:

- **Learn** — Microsoft Learn training path/module search for that skill.
- **Practice** — Microsoft Learn hands-on sandbox modules for that skill.
- **Certify** — Microsoft Credentials certification search for that skill (the Azure entry keeps the exact AZ-900 link).
- **Also learn** — a LinkedIn Learning course search link for that skill, surfaced in the Learn step's detail text (LinkedIn Learning is a Microsoft product, so it fits the same "primarily Microsoft" rule).

LinkedIn Learning is added as a second course source on the Microsoft path only. It is not added to the curated react / typescript / python / sql / aws / docker / kubernetes entries, which stay exactly as they are.

## 3. Microsoft sources stand out on the roadmap card

Any step whose provider is a Microsoft property (Microsoft Learn, Microsoft, LinkedIn Learning) renders in a highlighted style instead of the plain grey provider line:

- The step card gets a soft tinted background and a coloured left/outline border so it reads as a distinct box.
- The provider line becomes a small badge in the accent colour: "via Microsoft Learn" / "via LinkedIn Learning".
- "Open resource" on those steps uses the same accent colour.

The tint uses an existing theme token (no hardcoded colours), stays subtle in light and dark, and non-Microsoft steps look unchanged.

## Technical notes

- `src/lib/catalog.ts`: change the `ALIASES` cloud mappings, extend `MICROSOFT_KEYWORDS`, and generalise the current `microsoftCourse()` helper into a `microsoftPlan()` that returns course + practice + certify (and the LinkedIn Learning line) for a fallback skill. Curated `CATALOG` entries are untouched.
- `src/components/roadmap/RoadmapView.tsx`: add a `MICROSOFT_PROVIDERS` check in the step-row component driving the highlighted container class and the provider badge.
- `src/components/roadmap/ThisWeekPanel.tsx`: check whether it renders providers too; if so, apply the same badge for consistency.
