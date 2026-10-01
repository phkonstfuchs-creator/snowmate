import type { MessageKey } from "@/lib/i18n/translate";

/* What set_my_birth_date() answers. The database decides; these only map
   the answer to a message. */
export type BirthDateStatus = "set" | "already_set" | "too_young" | "invalid" | "unauthenticated";

export const BIRTH_DATE_MESSAGES: Record<BirthDateStatus, MessageKey> = {
  set: "age.set",
  already_set: "age.alreadySet",
  too_young: "age.tooYoung",
  invalid: "age.invalid",
  unauthenticated: "profile.sessionEnded",
};

export function isBirthDateStatus(value: unknown): value is BirthDateStatus {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BIRTH_DATE_MESSAGES, value);
}

/* A real calendar day in YYYY-MM-DD, as <input type="date"> sends it.
   Age limits are checked in the database against the Vienna day. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return valid ? value.trim() : null;
}
