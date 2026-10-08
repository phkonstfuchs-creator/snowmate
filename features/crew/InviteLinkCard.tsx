"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { settle } from "@/lib/settle";
import { createInviteAction, type CreateInviteResult } from "./invite-actions";
import { useT } from "@/lib/i18n/client";

const INK = "var(--ink-0)";
const INK_2 = "var(--ink-2)";

/* Creates a single-use link and hands it to the phone's share sheet, or
   copies it where sharing is not available. */
export default function InviteLinkCard() {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const share = async (link: string) => {
    const text = t("invite.shareText");
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Pistl", text, url: link });
        return;
      } catch {
        // Cancelled or unsupported: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setMessage(t("invite.copied"));
    } catch {
      setMessage(t("invite.copyManually"));
    }
  };

  const create = async () => {
    setPending(true);
    setMessage(null);
    const result = await settle<CreateInviteResult>(createInviteAction(), {
      ok: false,
      message: t("common.offline"),
    });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setUrl(result.url);
    await share(result.url);
  };

  return (
    <div className="print-card px-4 py-4">
      <p className="text-mono-label" style={{ color: "var(--rust)" }}>{t("invite.cardTitle")}</p>
      <p className="mt-1 text-sm leading-snug" style={{ color: INK_2 }}>
        {t("invite.cardHint")}
      </p>
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="card-tap text-mono-label mt-3 flex min-h-11 w-full items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: "var(--rust)", color: "var(--on-accent)" }}
      >
        <Icon name="share" size={14} strokeWidth={2} />
        {pending ? t("invite.creating") : url ? t("invite.newLink") : t("invite.createLink")}
      </button>
      {url && (
        <p className="mt-3 break-all text-xs" style={{ color: INK, fontFamily: "var(--font-mono-stack)" }}>
          {url}
        </p>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm" style={{ color: INK_2 }}>
        {message ?? ""}
      </p>
    </div>
  );
}
