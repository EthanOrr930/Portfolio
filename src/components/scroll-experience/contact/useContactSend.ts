import { useCallback, useState } from "react";
import { sendContact } from "@/lib/contact/sendContact";
import type { ContactInput } from "@/lib/contact/resendRequest";
import type { SendState } from "./contactTypes";

/**
 * Owns email delivery, decoupled from the fold theatre. The fold/flight play
 * regardless; this just tracks whether the message actually reached the inbox so
 * the final card can be honest about it.
 */
export function useContactSend() {
  const [sendState, setSendState] = useState<SendState>("idle");
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (values: ContactInput): Promise<SendState> => {
    setSendState("sending");
    setError(null);
    const result = await sendContact(values);
    if (result.status === "sent") {
      setSendState("sent");
      return "sent";
    }
    setSendState("error");
    setError(result.error ?? "Send failed");
    return "error";
  }, []);

  return { sendState, error, send };
}
