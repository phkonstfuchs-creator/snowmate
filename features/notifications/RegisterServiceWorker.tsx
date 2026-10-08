"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native-app";

/* Registers /sw.js for every signed-in browser, not only when push is on,
   so a lost connection shows Pistl's offline page with the tabs instead
   of the browser's error (ADR 0035). The store apps' shell has its own
   offline page (ADR 0031). */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (isNativeApp(navigator.userAgent)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Without a worker the app still works; offline shows the browser page. */
    });
  }, []);
  return null;
}
