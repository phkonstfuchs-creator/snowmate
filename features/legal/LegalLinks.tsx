"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";

/* Imprint and privacy policy, reachable from every entry point. */
export default function LegalLinks({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <nav aria-label={t("legal.imprint")} className={`flex justify-center gap-4 text-xs font-semibold underline ${className}`} style={{ color: "var(--ink-2)" }}>
      <Link href="/impressum">{t("legal.imprint")}</Link>
      <Link href="/datenschutz">{t("legal.privacyShort")}</Link>
      <Link href="/lizenzen">{t("legal.licenses")}</Link>
    </nav>
  );
}

/* "… you have read the {privacy} …" with the policy as a link. */
export function PrivacyConsent({ className = "" }: { className?: string }) {
  const t = useT();
  const [before, after = ""] = t("onb.terms").split("{privacy}");
  return (
    <p className={className} style={{ color: "var(--ink-2)" }}>
      {before}
      <Link href="/datenschutz" className="underline" target="_blank" rel="noopener">
        {t("legal.privacy")}
      </Link>
      {after}
    </p>
  );
}
