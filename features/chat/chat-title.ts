import { INTL_LOCALE, type Locale } from "@/lib/i18n/locales";
import type { Translate } from "@/lib/i18n/translate";
import type { ChatSummary } from "./message";

/* What a chat is called in the list and in its header. */
export function chatTitle(chat: ChatSummary, t: Translate, locale: Locale): { title: string; subtitle?: string } {
  if (chat.kind === "ride") {
    const date = chat.rideDate
      ? new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
          .format(new Date(`${chat.rideDate}T00:00:00Z`))
      : "";
    return {
      title: chat.rideResort ?? t("chat.rideChat"),
      subtitle: date ? `${t("chat.rideChat")} · ${date}` : t("chat.rideChat"),
    };
  }
  const title = chat.otherName ?? (chat.otherHandle ? `@${chat.otherHandle}` : t("common.rider"));
  return { title, subtitle: chat.otherHandle ? `@${chat.otherHandle}` : undefined };
}
