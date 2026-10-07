"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";

type IconName = Parameters<typeof Icon>[0]["name"];

/* "What can I do here?" answered in one line with one button. Each screen
   shows at most one, and only while its state leaves the next step
   unclear: no friends yet, nothing today, nothing shared. */
export default function NextStep({
  icon,
  text,
  action,
  href,
  onAction,
}: {
  icon: IconName;
  text: string;
  action: string;
  href?: string;
  onAction?: () => void;
}) {
  const button = "card-tap inline-flex min-h-11 shrink-0 items-center px-4 text-sm font-semibold";
  const style = { background: "var(--rust)", color: "var(--on-accent)", borderRadius: 12 };
  return (
    <aside role="note" className="mx-4 mt-4 flex items-center gap-3 p-3"
      style={{ background: "var(--paper-1)", border: "var(--rule-thin)", borderRadius: 18 }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center" style={{ background: "var(--paper-2)", borderRadius: 999 }}>
        <Icon name={icon} size={18} color="var(--rust)" />
      </span>
      <p className="min-w-0 flex-1 text-sm" style={{ color: "var(--ink-1)" }}>{text}</p>
      {href ? (
        <Link href={href} className={button} style={style}>{action}</Link>
      ) : (
        <button type="button" onClick={onAction} className={button} style={style}>{action}</button>
      )}
    </aside>
  );
}
