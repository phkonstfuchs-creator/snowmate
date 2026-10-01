"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { translator, type Translate } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/* Without a provider (tests, isolated renders) this is English. */
export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
