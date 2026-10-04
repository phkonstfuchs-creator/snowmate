"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

export default function ChatUnavailable({ reason }: { reason: MessageKey }) {
  const t = useT();
  return (
    <div className="px-4 pt-6">
      <Link href="/crew" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold" style={{ color: "var(--ink-1)" }}>
        <Icon name="chevron-left" size={16} /> {t("chat.back")}
      </Link>
      <p role="alert" className="mt-4 px-3 py-3 text-sm" style={{ border: "var(--rule-thin)", color: "var(--ink-1)" }}>
        {t(reason)}
      </p>
    </div>
  );
}
