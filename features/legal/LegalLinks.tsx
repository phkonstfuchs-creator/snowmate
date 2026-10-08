"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { TERMS_VERSION } from "./terms";

/* Imprint and privacy policy, reachable from every entry point. */
export default function LegalLinks({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <nav aria-label={t("legal.imprint")} className={`flex flex-wrap justify-center gap-x-4 text-xs font-semibold underline [&>a]:inline-flex [&>a]:min-h-11 [&>a]:min-w-11 [&>a]:items-center [&>a]:justify-center ${className}`} style={{ color: "var(--ink-2)" }}>
      <Link href="/impressum">{t("legal.imprint")}</Link>
      <Link href="/datenschutz">{t("legal.privacyShort")}</Link>
      <Link href="/nutzungsbedingungen">{t("legal.termsShort")}</Link>
      <Link href="/lizenzen">{t("legal.licenses")}</Link>
    </nav>
  );
}

/* Sign-up consent: the terms of use with zero tolerance (App Store 1.2,
   ADR 0034) and the privacy policy, both as links. The box is required in
   the browser and checked again by the server. */
export function TermsConsent({ className = "" }: { className?: string }) {
  const t = useT();
  const parts = t("onb.terms").split(/(\{terms\}|\{privacy\})/);
  return (
    <label className={`flex items-start gap-3 text-left ${className}`} style={{ color: "var(--ink-2)" }}>
      <input type="checkbox" name="acceptTerms" value={TERMS_VERSION} required className="mt-0.5 h-6 w-6 flex-shrink-0 accent-[var(--rust)]" />
      <span>
        {parts.map((part, index) => part === "{terms}" ? (
          <Link key={index} href="/nutzungsbedingungen" className="underline" target="_blank" rel="noopener">{t("legal.terms")}</Link>
        ) : part === "{privacy}" ? (
          <Link key={index} href="/datenschutz" className="underline" target="_blank" rel="noopener">{t("legal.privacy")}</Link>
        ) : part)}
      </span>
    </label>
  );
}
