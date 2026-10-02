import "server-only";

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, pickLocale, type Locale } from "./locales";
import { translator, type Translate } from "./translate";

/* Outside a request (tests, build) there are no cookies or headers; the
   default language applies. */
export async function getLocale(): Promise<Locale> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getT(): Promise<Translate> {
  return translator(await getLocale());
}
