/**
 * Pure builders for the contact → Resend request. Shared by the dev route
 * handler (`/api/contact`) and mirrored by the production Firebase function.
 *
 * No SDK, no I/O — `buildResendRequest` returns a `{ url, init }` the caller
 * `fetch`es, so the same logic runs in any runtime (Next route, Cloud Function).
 */

export interface ContactInput {
  email: string;
  subject: string;
  body: string;
}

export type ValidatedContact =
  | { ok: true; value: ContactInput }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = { email: 254, subject: 200, body: 5000 } as const;

/** Validate + normalize an untrusted request body into a ContactInput. */
export function validateContact(input: unknown): ValidatedContact {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Missing body" };
  }
  const { email, subject, body } = input as Record<string, unknown>;
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return { ok: false, error: "A valid email is required" };
  }
  if (typeof subject !== "string" || subject.trim().length === 0) {
    return { ok: false, error: "Subject is required" };
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return { ok: false, error: "Message is required" };
  }
  return {
    ok: true,
    value: {
      email: email.trim().slice(0, MAX.email),
      subject: subject.trim().slice(0, MAX.subject),
      body: body.trim().slice(0, MAX.body),
    },
  };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function renderEmailHtml(form: ContactInput): string {
  const safeBody = escapeHtml(form.body).replace(/\n/g, "<br>");
  return (
    `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1c1c1f">` +
    `<p style="margin:0 0 4px;color:#8c7c5e;font-size:12px;letter-spacing:.08em;text-transform:uppercase">New portfolio message</p>` +
    `<p style="margin:0 0 16px;font-size:18px">${escapeHtml(form.subject)}</p>` +
    `<p style="margin:0 0 16px;font-size:14px;color:#6b5e48">From: ${escapeHtml(form.email)}</p>` +
    `<div style="padding:16px;background:#f4efe7;border-radius:8px;font-size:15px">${safeBody}</div>` +
    `</div>`
  );
}

/** Build the Resend `POST /emails` request. `apiKey`/`to` come from secrets. */
export function buildResendRequest(
  form: ContactInput,
  apiKey: string,
  to: string,
): { url: string; init: RequestInit } {
  return {
    url: "https://api.resend.com/emails",
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Portfolio Contact <onboarding@resend.dev>",
        to: [to],
        reply_to: form.email,
        subject: `[Portfolio] ${form.subject}`,
        html: renderEmailHtml(form),
        text: `From: ${form.email}\nSubject: ${form.subject}\n\n${form.body}`,
      }),
    },
  };
}
