import { NextRequest, NextResponse } from "next/server";
import { validateContact, buildResendRequest } from "@/lib/contact/resendRequest";

/**
 * Dev-only contact endpoint (works under `next dev`). Static export drops POST
 * route handlers from the production build, so the live site routes `/api/contact`
 * to the Firebase function instead (see `functions/src/index.ts`). Both share the
 * pure builders in `@/lib/contact/resendRequest`.
 *
 * Secrets: RESEND_API_KEY + CONTACT_TO_EMAIL from `.env.local`.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({ error: "Email is not configured on the server" }, { status: 500 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateContact(payload);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { url, init } = buildResendRequest(validated.value, apiKey, to);
  const resp = await fetch(url, init);
  if (!resp.ok) {
    const detail = await resp.text();
    return NextResponse.json({ error: `Mail provider error (${resp.status})`, detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
