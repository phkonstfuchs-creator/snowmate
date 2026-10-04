"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import PenguinMascot from "@/components/PenguinMascot";

/* Frame shared by the smaller auth screens (2FA, password reset). */
export default function AuthShell({ eyebrow, title, lead, children }: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <main className="min-h-dvh" style={{ background: "var(--ink-0)" }}>
      <div className="paper-grain mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-8" style={{ background: "var(--paper-0)" }}>
        <Link href="/onboarding" aria-label={t("auth.backToStart")} className="-my-2 flex w-fit items-center gap-2 py-2 pt-6">
          <PenguinMascot size={26} />
          <span className="text-mono-label" style={{ color: "var(--ink-0)" }}>Snowmate</span>
        </Link>
        <div className="flex flex-1 flex-col justify-center py-8">
          <p className="text-mono-label" style={{ color: "var(--rust)" }}>{eyebrow}</p>
          <h1 className="text-display-lg mt-3" style={{ color: "var(--ink-0)" }}>{title}</h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-1)" }}>{lead}</p>
          <div className="mt-6 mb-6" style={{ borderTop: "var(--rule-thin)" }} aria-hidden="true" />
          {children}
        </div>
      </div>
    </main>
  );
}
