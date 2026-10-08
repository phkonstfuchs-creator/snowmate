"use client";

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
