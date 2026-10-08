"use client";

import { useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useT } from "@/lib/i18n/client";
import PushSettings from "./PushSettings";

const ASKED_KEY = "pistl.pushAsked";

/* Asked once per browser, after the first ride someone joins: the moment
   a notice is obviously useful (usability protocol, task 8). */
export function claimPushAsk(): boolean {
  try {
    if (window.localStorage.getItem(ASKED_KEY)) return false;
    window.localStorage.setItem(ASKED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/* The ask after a join, shared by the feed and events. It is claimed at
   once but shown only when no other sheet is open, so it never sits
   hidden behind the ride sheet it was triggered from. */
export function usePushAskAfterJoin(enabled: boolean) {
  const [pending, setPending] = useState(false);
  return {
    pending,
    offer: () => { if (enabled && claimPushAsk()) setPending(true); },
    dismiss: () => setPending(false),
  };
}

export default function PushAsk({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Sheet title={t("push.askTitle")} onClose={onClose}>
      {(close) => (
        <>
          <div className="-mx-4">
            <PushSettings />
          </div>
          <button type="button" onClick={close} className="flex min-h-12 w-full items-center justify-center text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
            {t("push.later")}
          </button>
        </>
      )}
    </Sheet>
  );
}
