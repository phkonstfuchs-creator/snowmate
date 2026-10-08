"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RESUME_AFTER_MS = 10_000;
/* Every write refreshes at once, a return from the background after 10 s
   does too, and chats poll on their own; this is only the fallback for
   a screen left open. Once a minute cost about two thirds of all backend
   requests at peak (team review 2026-10-07, finding #6). */
const WHILE_OPEN_MS = 5 * 60_000;

/* A home-screen app is not reloaded when it comes back from the
   background; without this it keeps showing what it had, until a
   restart. Refreshes the data when the app returns after a while, and
   every five minutes while it is open and visible. */
export default function RefreshOnResume() {
  const router = useRouter();

  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null && Date.now() - hiddenAt > RESUME_AFTER_MS) {
        hiddenAt = null;
        router.refresh();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, WHILE_OPEN_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
