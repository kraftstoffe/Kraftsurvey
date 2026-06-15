"use client";

import { useCallback, useRef, useState } from "react";

type FlashVariant = "success" | "error";

export function useFlashMessage(duration = 2000) {
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<FlashVariant>("success");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback(
    (text: string, messageVariant: FlashVariant = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(text);
      setVariant(messageVariant);
      timerRef.current = setTimeout(() => setMessage(""), duration);
    },
    [duration]
  );

  const copyToClipboard = useCallback(
    async (text: string, successMsg = "Link kopiert") => {
      try {
        await navigator.clipboard.writeText(text);
        showMessage(successMsg, "success");
      } catch {
        showMessage("Kopieren fehlgeschlagen", "error");
      }
    },
    [showMessage]
  );

  return { message, variant, showMessage, copyToClipboard };
}
