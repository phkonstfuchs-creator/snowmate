import { de } from "./messages/de";
import { en, type MessageKey } from "./messages/en";
import type { Locale } from "./locales";

export type { MessageKey } from "./messages/en";

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, de };

export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

/* Replaces {name} placeholders. A missing variable stays visible as
   {name}, which a test catches more easily than an empty string. */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale];
  return (key, vars) => format(dictionary[key] ?? en[key], vars);
}

export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(en, value);
}

/* Rule modules return message keys; anything else (a message that was
   already translated on the server) passes through unchanged. */
export function translateText(t: Translate, text: string): string {
  return isMessageKey(text) ? t(text) : text;
}

/* Validation messages may carry a count: "v.max|120" → t("v.max", { n: 120 }). */
export function translateValidation(t: Translate, text: string): string {
  const [key, n] = text.split("|");
  if (isMessageKey(key)) return t(key, n === undefined ? undefined : { n });
  return text;
}

export function translateFieldErrors<K extends string, V extends string | string[]>(
  t: Translate,
  errors: Partial<Record<K, V>>,
): Partial<Record<K, V>> {
  const out: Partial<Record<K, V>> = {};
  for (const [field, message] of Object.entries(errors) as [K, V | undefined][]) {
    if (message === undefined) continue;
    out[field] = (Array.isArray(message)
      ? message.map((text) => translateValidation(t, text))
      : translateValidation(t, message)) as V;
  }
  return out;
}
