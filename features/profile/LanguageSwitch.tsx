"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";

/* Saves the choice in a cookie; the server renders the next page in it. */
export default function LanguageSwitch() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <section className="px-4 pb-4" aria-busy={pending}>
      <div className="section-rule">
        <h2 className="text-mono-label" style={{ color: "var(--ink-0)" }}>{t("profile.language")}</h2>
      </div>
      <div className="mt-2">
        <SegmentedControl
          options={[
            { value: "de", label: "Deutsch" },
            { value: "en", label: "English" },
          ]}
          value={locale}
          onChange={choose}
          ariaLabel={t("profile.language")}
        />
      </div>
    </section>
  );
}
