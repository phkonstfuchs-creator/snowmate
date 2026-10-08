"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import { useT } from "@/lib/i18n/client";
import PushSettings from "./PushSettings";

const ASKED_KEY = "pistl.pushAsked";

/* Check without consuming the offer: navigation may happen before it is shown. */
function canOfferPushAsk(): boolean {
  try {
    return !window.localStorage.getItem(ASKED_KEY);
  } catch {
    return false;
  }
}

/* Wait until other sheets close. Only the mounted prompt consumes the offer. */
export function usePushAskAfterJoin(enabled: boolean) {
  const [pending, setPending] = useState(false);
  return {
    pending,
    offer: () => { if (enabled && canOfferPushAsk()) setPending(true); },
    dismiss: () => setPending(false),
  };
}

export default function PushAsk({ onClose }: { onClose: () => void }) {
  const t = useT();
  useEffect(() => {
    try {
      window.localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* Storage may become unavailable after the offer was scheduled. */
    }
  }, []);
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
