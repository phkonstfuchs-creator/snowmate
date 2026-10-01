"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PenguinMascot from "@/components/PenguinMascot";
import { settle } from "@/lib/settle";
import { acceptInviteAction, type AcceptInviteResult } from "./invite-actions";
import { INVITE_MESSAGES, PENDING_INVITE_KEY } from "./invites";
import type { InvitePreview } from "./queries";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";
const RUST = "var(--rust)";

function remember(token: string) {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Without storage the visitor simply opens the link again after signing in.
  }
}

function forget() {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Nothing to clean up.
  }
}

const primary: React.CSSProperties = {
  background: RUST,
  color: "var(--paper-0)",
  border: "var(--rule-thick)",
  boxShadow: "var(--shadow-print)",
};

/* `preview` is undefined for signed-out visitors (they see no name) and
   null when the backend could not be reached. */
export default function InviteScreen({
  token,
  preview,
}: {
  token: string;
  preview?: InvitePreview | null;
}) {
  const signedIn = preview !== undefined;
  const [result, setResult] = useState<AcceptInviteResult | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (signedIn) forget();
    else remember(token);
  }, [signedIn, token]);

  const accept = async () => {
    setPending(true);
    setResult(await settle(acceptInviteAction(token), { ok: false, message: "No connection. Try again in a moment." }));
    setPending(false);
  };

  const inviter = preview?.inviterName ?? (preview?.inviterHandle ? `@${preview.inviterHandle}` : "Someone");

  return (
    <main className="paper-grain flex min-h-dvh flex-col items-center justify-center px-6 text-center" style={{ background: "var(--paper-0)" }}>
      <PenguinMascot size={72} />
      <p className="text-mono-label mt-6" style={{ color: RUST }}>Crew invite</p>

      {!signedIn && (
        <>
          <h1 className="text-display-md mt-2" style={{ color: INK }}>You have been invited to a crew on Snowmate</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: INK_2 }}>
            Sign in or create an account. You will be asked to confirm the invite right after.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/onboarding" className="card-tap font-display px-6 py-3 text-lg uppercase" style={primary}>
              Create account
            </Link>
            <Link href="/login" className="text-sm font-semibold underline" style={{ color: INK }}>
              I already have an account
            </Link>
          </div>
        </>
      )}

      {signedIn && preview === null && (
        <p role="status" className="mt-4 text-sm" style={{ color: "var(--crimson)" }}>
          The invite could not be loaded. Try again shortly.
        </p>
      )}

      {signedIn && preview && !result && (
        preview.status === "valid" ? (
          <>
            <h1 className="text-display-md mt-2" style={{ color: INK }}>{inviter} wants you in their crew</h1>
            {preview.inviterHandle && preview.inviterName && (
              <p className="mt-1 text-sm" style={{ color: INK_2 }}>@{preview.inviterHandle}</p>
            )}
            <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: INK_2 }}>
              Friends see each other&apos;s rides with the meeting point. Only confirm if you know them.
            </p>
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="card-tap font-display mt-6 px-6 py-3 text-lg uppercase disabled:opacity-50"
              style={primary}
            >
              {pending ? "One moment…" : "Add to my crew"}
            </button>
            <Link href="/feed" className="mt-4 text-sm underline" style={{ color: INK_2 }}>
              Not now
            </Link>
          </>
        ) : (
          <>
            <p role="status" className="mt-3 max-w-sm text-base" style={{ color: INK }}>
              {INVITE_MESSAGES[preview.status]}
            </p>
            <Link href={preview.status === "profile_incomplete" ? "/profile" : "/crew"} className="mt-6 text-sm font-semibold underline" style={{ color: INK }}>
              {preview.status === "profile_incomplete" ? "Go to profile" : "Go to your crew"}
            </Link>
          </>
        )
      )}

      {result && (
        <>
          <p role="status" className="mt-3 max-w-sm text-base" style={{ color: result.ok ? INK : "var(--crimson)" }}>
            {result.message}
          </p>
          <Link href="/crew" className="card-tap font-display mt-6 px-6 py-3 text-lg uppercase" style={primary}>
            Go to your crew
          </Link>
        </>
      )}
    </main>
  );
}
