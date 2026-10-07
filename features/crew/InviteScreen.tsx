"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";
import { settle } from "@/lib/settle";
import { acceptInviteAction, type AcceptInviteResult } from "./invite-actions";
import { INVITE_MESSAGES, PENDING_INVITE_KEY } from "./invites";
import type { InvitePreview } from "./queries";
import { useT } from "@/lib/i18n/client";
import { translateText } from "@/lib/i18n/translate";

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
  const t = useT();
  const signedIn = preview !== undefined;
  const [result, setResult] = useState<AcceptInviteResult | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (signedIn) forget();
    else remember(token);
  }, [signedIn, token]);

  const accept = async () => {
    setPending(true);
    setResult(await settle(acceptInviteAction(token), { ok: false, message: t("common.offline") }));
    setPending(false);
  };

  const inviter = preview?.inviterName ?? (preview?.inviterHandle ? `@${preview.inviterHandle}` : t("invite.someone"));

  return (
    <main className="paper-grain flex min-h-dvh flex-col items-center justify-center px-6 text-center" style={{ background: "var(--paper-0)" }}>
      <Wordmark size={44} />
      <p className="text-mono-label mt-6" style={{ color: RUST }}>{t("invite.crewInvite")}</p>

      {!signedIn && (
        <>
          <h1 className="text-display-md mt-2" style={{ color: INK }}>{t("invite.invitedTitle")}</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: INK_2 }}>
            {t("invite.signInLead")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/onboarding" className="card-tap font-display px-6 py-3 text-lg" style={primary}>
              {t("auth.createAccount")}
            </Link>
            <Link href="/login" className="text-sm font-semibold underline" style={{ color: INK }}>
              {t("onb.haveAccount")}
            </Link>
          </div>
        </>
      )}

      {signedIn && preview === null && (
        <p role="status" className="mt-4 text-sm" style={{ color: "var(--crimson)" }}>
          {t("invite.loadFailed")}
        </p>
      )}

      {signedIn && preview && !result && (
        preview.status === "valid" ? (
          <>
            <h1 className="text-display-md mt-2" style={{ color: INK }}>{t("invite.wantsYou", { name: inviter })}</h1>
            {preview.inviterHandle && preview.inviterName && (
              <p className="mt-1 text-sm" style={{ color: INK_2 }}>@{preview.inviterHandle}</p>
            )}
            <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: INK_2 }}>
              {t("invite.onlyIfKnown")}
            </p>
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="card-tap font-display mt-6 px-6 py-3 text-lg disabled:opacity-50"
              style={primary}
            >
              {pending ? t("common.oneMoment") : t("invite.addToCrew")}
            </button>
            <Link href="/feed" className="mt-4 text-sm underline" style={{ color: INK_2 }}>
              {t("invite.notNow")}
            </Link>
          </>
        ) : (
          <>
            <p role="status" className="mt-3 max-w-sm text-base" style={{ color: INK }}>
              {t(INVITE_MESSAGES[preview.status])}
            </p>
            <Link href={preview.status === "profile_incomplete" ? "/profile" : "/crew"} className="mt-6 text-sm font-semibold underline" style={{ color: INK }}>
              {preview.status === "profile_incomplete" ? t("invite.goProfile") : t("invite.goCrew")}
            </Link>
          </>
        )
      )}

      {result && (
        <>
          <p role="status" className="mt-3 max-w-sm text-base" style={{ color: result.ok ? INK : "var(--crimson)" }}>
            {translateText(t, result.message)}
          </p>
          <Link href="/crew" className="card-tap font-display mt-6 px-6 py-3 text-lg" style={primary}>
            {t("invite.goCrew")}
          </Link>
        </>
      )}
    </main>
  );
}
