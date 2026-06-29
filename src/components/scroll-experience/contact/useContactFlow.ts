import { useCallback, useRef, useState } from "react";
import { validateContact, type ContactInput } from "@/lib/contact/resendRequest";
import type { ContactPhase, PaperFoldApi, SendState } from "./contactTypes";

interface FlowDeps {
  values: ContactInput;
  reducedMotion: boolean;
  send: (values: ContactInput) => Promise<SendState>;
}

/**
 * The contact state machine: filling → folding → flying → sent. Send fires the
 * email and auto-folds the sheet (no interaction); when the fold settles the
 * plane winds up and flings off (flying), then the card appears (sent).
 * Reduced-motion skips straight to sent.
 */
export function useContactFlow({ values, reducedMotion, send }: FlowDeps) {
  const [phase, setPhase] = useState<ContactPhase>("filling");
  const apiRef = useRef<PaperFoldApi | null>(null);

  const onSend = useCallback(async () => {
    if (!validateContact(values).ok) return;
    if (reducedMotion) {
      await send(values);
      setPhase("sent");
      return;
    }
    setPhase("folding");
    apiRef.current?.foldAll();
    void send(values);
  }, [values, reducedMotion, send]);

  const onApi = useCallback((api: PaperFoldApi) => { apiRef.current = api; }, []);
  const onFoldSettled = useCallback(() => setPhase("flying"), []);
  const onFlightComplete = useCallback(() => setPhase("sent"), []);

  return { phase, onSend, onApi, onFoldSettled, onFlightComplete };
}
