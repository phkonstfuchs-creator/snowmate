"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PENDING_INVITE_KEY, isInviteToken } from "./invites";

/* Someone who opened an invite link while signed out lands here after
   signing in (possibly after email confirmation). Send them back to the
   invite once, so they can confirm it explicitly. */
export default function PendingInviteSync() {
  const router = useRouter();

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(PENDING_INVITE_KEY);
      localStorage.removeItem(PENDING_INVITE_KEY);
    } catch {
      return;
    }
    if (isInviteToken(token)) router.push(`/invite/${token}`);
  }, [router]);

  return null;
}
