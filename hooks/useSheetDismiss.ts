"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Sheets used to slide in and then vanish instantly on close —
   exactly the hard cut that motion is supposed to absorb. This hook
   keeps the sheet mounted until the exit has run and reports the
   state to the panel as data-state.

   The exit is deliberately shorter than the entrance: opening is
   what you watch, while on closing the decision is already made and
   any delay feels sluggish. */
const EXIT_MS = 160;

export function useSheetDismiss(onClose: () => void) {
  const [state, setState] = useState<"open" | "closing">("open");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    /* Repeated taps must not restart the timer */
    if (timerRef.current) return;

    /* Anyone asking for less motion gets no waiting period */
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      closeRef.current();
      return;
    }

    setState("closing");
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      closeRef.current();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, dismiss };
}
