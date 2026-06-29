/** All visitor-facing strings for the contact section, in one place. */
export const CONTACT_COPY = {
  eyebrow: "Get in touch",
  heading: "Contact me",
  lead: "A note on paper — write it, send it, then fold it into a plane.",
  fields: {
    email: "your@email.com",
    subject: "Subject",
    body: "Write your message…",
  },
  button: {
    send: "Send",
    sending: "Sending…",
    folding: "Folding…",
    flying: "Off it goes…",
    sent: "Sent ✓",
  },
  status: {
    sent: "Landed in the inbox.",
    error: "Couldn’t email it — your note still folds. Try again?",
  },
  success: {
    title: "On its way",
    body: "Thanks for reaching out — I’ll reply soon.",
  },
} as const;
