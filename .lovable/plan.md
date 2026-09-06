# Improve chatbot message formatting

## What will change
- Render coach replies as Markdown in both the main coaching chat and saved chat pages, so bold text, headings, paragraphs, links, and bullet/numbered lists display correctly.
- Keep user messages as plain text so text the user types is never unexpectedly reformatted.
- Improve spacing and hierarchy inside coach replies while preserving the current Hike visual style, logo, and high-contrast user message treatment.
- Keep existing interactive onboarding cards and chat behavior unchanged.

## Technical details
- Add the official AI Elements message component and its required styling source, then use `Message`, `MessageContent`, and `MessageResponse` for chat messages instead of printing `message.content` directly.
- Apply the same shared rendering treatment in `ChatView.tsx` and `ThreadChatView.tsx` so formatting is consistent across every conversation.
- Preserve line wrapping and add restrained typography for paragraphs, lists, bold text, and links; assistant text will remain visually lightweight rather than becoming a heavy colored bubble.
- Verify the supplied example renders real bold section labels and properly spaced bullets, then check both desktop and narrow mobile layouts and run the project checks.

## Scope
This changes presentation only. Message storage, coach prompts, tools, conversation history, and roadmap behavior will not change.
