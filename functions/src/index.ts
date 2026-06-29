import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { validateContact, buildResendRequest } from "./resendRequest";

// Secrets — set with: firebase functions:secrets:set RESEND_API_KEY
//                      firebase functions:secrets:set CONTACT_TO_EMAIL
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const CONTACT_TO_EMAIL = defineSecret("CONTACT_TO_EMAIL");

/**
 * Production contact endpoint. The static site has no server, so Firebase
 * Hosting rewrites `/api/contact` → this function (see firebase.json). The
 * Resend key + recipient live as secrets and never reach the browser.
 */
export const contact = onRequest(
  { secrets: [RESEND_API_KEY, CONTACT_TO_EMAIL], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const validated = validateContact(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const { url, init } = buildResendRequest(
      validated.value,
      RESEND_API_KEY.value(),
      CONTACT_TO_EMAIL.value(),
    );
    const resp = await fetch(url, init);
    if (!resp.ok) {
      const detail = await resp.text();
      res.status(502).json({ error: `Mail provider error (${resp.status})`, detail });
      return;
    }

    res.status(200).json({ ok: true });
  },
);
