"use client";

import { useRef } from "react";
import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

type IconName = Parameters<typeof Icon>[0]["name"];

interface Item {
  icon: IconName;
  label: MessageKey;
  hint: MessageKey;
  onSelect?: () => void;
  href?: string;
}

/* One "+" instead of four header buttons: everything you can start from
   Today, each with a one-line hint so nobody has to guess. */
export default function CreateMenu({ basePath, onPostRide, onShareDay, onClose }: {
  basePath: string;
  onPostRide: () => void;
  /* Only signed in: sharing a day needs an account. */
  onShareDay?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  /* The chosen sheet opens only once this one has finished closing, so
     two dialogs never compete for Escape and focus. */
  const next = useRef<(() => void) | null>(null);
  const items: Item[] = [
    { icon: "plus", label: "feed.postRide", hint: "create.rideHint", onSelect: onPostRide },
    ...(onShareDay ? [{ icon: "sparkles" as IconName, label: "posts.shareDay" as MessageKey, hint: "create.dayHint" as MessageKey, onSelect: onShareDay }] : []),
    { icon: "car", label: "nav.carpool", hint: "create.carpoolHint", href: `${basePath}/carpool` },
    { icon: "calendar-days", label: "nav.events", hint: "create.eventsHint", href: `${basePath}/events` },
  ];

  return (
    <Sheet title={t("create.title")} onClose={() => { onClose(); next.current?.(); }}>
      {(close) => (
        <ul className="space-y-2">
          {items.map((item) => {
            const body = (
              <>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ background: "var(--paper-2)", borderRadius: 14 }}>
                  <Icon name={item.icon} size={20} color="var(--rust)" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-base font-semibold" style={{ color: "var(--ink-0)" }}>{t(item.label)}</span>
                  <span className="block text-sm" style={{ color: "var(--ink-2)" }}>{t(item.hint)}</span>
                </span>
              </>
            );
            const className = "card-tap flex min-h-16 w-full items-center gap-3 px-3 py-2";
            const style = { background: "var(--paper-1)", border: "var(--rule-thin)", borderRadius: 16 };
            return (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} className={className} style={style}>{body}</Link>
                ) : (
                  <button type="button" className={className} style={style} onClick={() => {
                    next.current = item.onSelect ?? null;
                    close();
                  }}>{body}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
