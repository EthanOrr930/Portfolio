import type { ContactInput } from "@/lib/contact/resendRequest";

/** Flow of the contact experience, owned by ContactSection. */
export type ContactPhase = "filling" | "folding" | "flying" | "sent";

/** Email delivery status, tracked independently of the fold theatre. */
export type SendState = "idle" | "sending" | "sent" | "error";

/** Imperative handle PaperMesh hands up so Send can drive the auto-fold. */
export interface PaperFoldApi {
  foldAll(): void;
  reset(): void;
  getDone(): boolean;
}

export const EMPTY_CONTACT: ContactInput = { email: "", subject: "", body: "" };
