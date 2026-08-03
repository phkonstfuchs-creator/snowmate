"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Sheets fuhren bisher herein und verschwanden beim Schliessen
   schlagartig — genau der harte Sprung, den Bewegung eigentlich
   abfangen soll. Der Hook haelt das Sheet so lange montiert, bis
   die Ausblendung gelaufen ist, und meldet den Zustand als
   data-state an das Panel.

   Das Ausblenden ist bewusst kuerzer als das Einblenden: beim
   Oeffnen schaut man hin, beim Schliessen ist die Entscheidung
   schon gefallen und jede Verzoegerung fuehlt sich zaeh an. */
const EXIT_MS = 160;

export function useSheetDismiss(onClose: () => void) {
  const [state, setState] = useState<"open" | "closing">("open");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const dismiss = useCallback(() => {
    /* Mehrfaches Antippen darf den Timer nicht neu starten */
    if (timerRef.current) return;

    /* Wer weniger Bewegung will, bekommt keine Warteschleife */
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
