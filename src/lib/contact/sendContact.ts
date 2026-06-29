import type { ContactInput } from "./resendRequest";

export type SendStatus = "sent" | "error";

export interface SendResult {
  status: SendStatus;
  error?: string;
}

/**
 * Client-side send. POSTs to `/api/contact` — the dev route handler in
 * `next dev`, and the Firebase function in production (a hosting rewrite maps
 * the same path to the function), so the browser never branches on env and the
 * Resend key never ships to the client.
 */
export async function sendContact(input: ContactInput): Promise<SendResult> {
  try {
    const resp = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!resp.ok) {
      const data = (await resp.json().catch(() => null)) as { error?: string } | null;
      return { status: "error", error: data?.error ?? `Request failed (${resp.status})` };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}
