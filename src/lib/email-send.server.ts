/**
 * Single outbound email path for the app.
 *
 * Resend is linked through the Lovable connector gateway, so sends go to the
 * gateway (authenticated with the project's Lovable key plus the connector
 * key) rather than to api.resend.com directly.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend/emails";

export type SendEmailResult =
  | { ok: true; status: number }
  | { ok: false; status: number; body: string };

export function emailConfigured(): boolean {
  return Boolean(
    process.env["LOVABLE_API_KEY"] && process.env["RESEND_API_KEY"] && process.env["MENTOR_EMAIL_FROM"],
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectorKey = process.env["RESEND_API_KEY"];
  const from = process.env["MENTOR_EMAIL_FROM"];

  if (!lovableKey || !connectorKey || !from) {
    return { ok: false, status: 0, body: "Email sending is not configured." };
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectorKey,
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (response.ok) return { ok: true, status: response.status };

  const body = await response.text();
  console.error(`email send failed [${response.status}]: ${body}`);
  return { ok: false, status: response.status, body };
}
