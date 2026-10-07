"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { signOutAction } from "@/features/auth/actions";
import { clearStoredSkiDay } from "@/features/tracking/useSkiDayTracker";
import { removePushOnSignOut } from "./remove-on-sign-out";
import { ONBOARDING_DRAFT_KEY } from "@/features/profile/profile-input";

export default function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  const [cleaning, setCleaning] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cleaning || signingOut) return;
    setCleaning(true);
    clearStoredSkiDay();
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {
      // Unavailable browser storage must not prevent signing out.
    }
    try {
      await removePushOnSignOut();
    } catch {
      // Revoking push is best effort; a browser failure must not trap the user.
    }
    setCleaning(false);
    startSignOut(async () => { await signOutAction(); });
  };

  return <form action={signOutAction} onSubmit={(event) => void submit(event)} className={className} aria-busy={cleaning || signingOut}>
    {children}
  </form>;
}
