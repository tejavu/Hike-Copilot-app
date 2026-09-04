// Confirmation-email content for a booked mentoring session.
//
// Pure builders so the same template can be previewed in-app and sent from the
// server. Delivery itself lives in mentor-email.functions.ts.

export type EmailRecipientKind = "mentee" | "mentor";

export type SessionEmailInput = {
  menteeName: string;
  menteeEmail: string | null;
  mentorName: string;
  mentorEmail: string | null;
  mentorTitle: string;
  mentorCompany: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  format: string;
  location: string;
  purpose: string;
  meetingLink: string | null;
};

export type BuiltEmail = {
  kind: EmailRecipientKind;
  to: string | null;
  subject: string;
  text: string;
  html: string;
};

export function formatEmailDateTime(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

export function formatFormatLabel(format: string): string {
  if (format === "in_person") return "In person";
  if (format === "teams") return "Microsoft Teams";
  return "Online video call";
}

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function shell(heading: string, intro: string, rows: [string, string][], closing: string): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#63637a;font-size:13px;width:150px;">${escape(label)}</td>` +
        `<td style="padding:8px 0;color:#1b1b25;font-size:14px;font-weight:600;">${escape(value)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e3e6f0;">
        <tr><td style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0f6cbd;font-weight:700;">Hike Copilot · Mentor Match</td></tr>
        <tr><td style="padding-top:10px;font-size:24px;line-height:1.3;color:#1b1b25;font-weight:700;">${escape(heading)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3c3c4a;">${escape(intro)}</td></tr>
        <tr><td style="padding-top:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3e6f0;">${rowsHtml}</table></td></tr>
        <tr><td style="padding-top:18px;font-size:14px;line-height:1.6;color:#3c3c4a;">${escape(closing)}</td></tr>
        <tr><td style="padding-top:22px;font-size:12px;color:#8a8aa0;line-height:1.5;">A calendar invitation (.ics) is attached so this lands in your calendar. Sent by Hike Copilot on behalf of the mentee.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildSessionEmails(input: SessionEmailInput): BuiltEmail[] {
  const when = formatEmailDateTime(input.startsAt, input.timezone);
  const formatLabel = formatFormatLabel(input.format);
  const rows: [string, string][] = [
    ["Mentor", `${input.mentorName} — ${input.mentorTitle}, ${input.mentorCompany}`],
    ["Mentee", input.menteeName],
    ["When", when],
    ["Timezone", input.timezone],
    ["Format", formatLabel],
    ["Where", input.meetingLink ?? input.location],
    ["Purpose", input.purpose],
  ];

  const menteeIntro = `Your mentoring session with ${input.mentorName} is confirmed. Here's everything in one place.`;
  const menteeClosing =
    "Bring your prepped questions — they're waiting for you in Hike Copilot. If you need to move it, reschedule in the app and we'll send a fresh confirmation.";

  const mentorIntro = `${input.menteeName} has booked mentoring time with you through Hike Copilot. Thank you for volunteering your hours.`;
  const mentorClosing = `She wants to talk about: ${input.purpose}. If you're hosting on Microsoft Teams, reply with the meeting link and it'll be added to the calendar entry.`;

  const asText = (heading: string, intro: string, closing: string) =>
    [heading, "", intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", closing].join(
      "\n",
    );

  return [
    {
      kind: "mentee",
      to: input.menteeEmail,
      subject: `Confirmed: mentoring with ${input.mentorName} — ${when}`,
      text: asText("Your session is confirmed", menteeIntro, menteeClosing),
      html: shell("Your session is confirmed", menteeIntro, rows, menteeClosing),
    },
    {
      kind: "mentor",
      to: input.mentorEmail,
      subject: `New mentoring session with ${input.menteeName} — ${when}`,
      text: asText("A mentee has booked time with you", mentorIntro, mentorClosing),
      html: shell("A mentee has booked time with you", mentorIntro, rows, mentorClosing),
    },
  ];
}

/* ------------------------- mentor request / accept ------------------------ */

export type MentorRequestEmailInput = {
  mentorName: string;
  menteeName: string;
  goal: string | null;
  targetRole: string | null;
  mentorshipTopics: string[];
  sessionFocus: string | null;
  language: string | null;
  meetingPref: string;
  prioritySkills: string[];
  acceptUrl: string;
  declineUrl: string;
};

/** The ask a mentor receives before anything is scheduled. */
export function buildMentorRequestEmail(input: MentorRequestEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const rows: [string, string][] = [
    ["Mentee", input.menteeName],
    ["Her goal", input.goal || "Not stated"],
    ["Target role", input.targetRole || "Not stated"],
    ["Looking for", input.mentorshipTopics.join(", ") || "Not stated"],
    ["Focus for a first session", input.sessionFocus || "Not stated"],
    ["Skills she's building", input.prioritySkills.join(", ") || "Not stated"],
    ["Preferred language", input.language || "No preference"],
    ["Meeting preference", formatMeetingPref(input.meetingPref)],
  ];

  const heading = `${input.menteeName} would like you as her mentor`;
  const intro =
    "She's been matched with you through Hike Copilot because your experience lines up with what she's working on. Nothing is scheduled yet — she can only book time once you say yes.";
  const closing =
    "If you accept, she'll be able to pick a slot from your published availability, at least a week ahead. If now isn't the right time, decline and we'll match her with someone else — no explanation needed.";

  const buttons = `<tr><td style="padding-top:24px;">
    <a href="${input.acceptUrl}" style="display:inline-block;background:#0f6cbd;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;margin-right:10px;">Yes, I'll mentor her</a>
    <a href="${input.declineUrl}" style="display:inline-block;background:#ffffff;color:#3c3c4a;border:1px solid #c9cbd8;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">Not right now</a>
  </td></tr>`;

  const html = shell(heading, intro, rows, closing).replace(
    /<tr><td style="padding-top:22px;font-size:12px/,
    `${buttons}<tr><td style="padding-top:22px;font-size:12px`,
  );

  const text = [
    heading,
    "",
    intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Accept: ${input.acceptUrl}`,
    `Decline: ${input.declineUrl}`,
    "",
    closing,
  ].join("\n");

  return { subject: `Mentoring request from ${input.menteeName}`, text, html };
}

function formatMeetingPref(pref: string): string {
  if (pref === "remote") return "Remote";
  if (pref === "in_person") return "In person";
  return "Either works";
}

export type MentorReadyEmailInput = {
  menteeName: string;
  mentorName: string;
  mentorTitle: string;
  mentorCompany: string;
  availabilitySummary: string;
  appUrl: string;
};

/** Sent to the mentee the moment her mentor accepts. */
export function buildMentorReadyEmail(input: MentorReadyEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const heading = `${input.mentorName.split(" ")[0]} said yes`;
  const intro = `Good news — ${input.mentorName} has accepted your mentoring request. Scheduling is open now, so you can pick a time that suits you both.`;
  const rows: [string, string][] = [
    ["Mentor", `${input.mentorName} — ${input.mentorTitle}, ${input.mentorCompany}`],
    ["Availability", input.availabilitySummary],
    ["Next step", "Book a session in Hike Copilot"],
  ];
  const closing = `Open Mentor Match to choose a slot: ${input.appUrl}. Sessions are booked at least a week ahead so your mentor has time to prepare.`;
  return {
    subject: `${input.mentorName} accepted your mentoring request`,
    text: [heading, "", intro, "", ...rows.map(([l, v]) => `${l}: ${v}`), "", closing].join("\n"),
    html: shell(heading, intro, rows, closing),
  };
}
