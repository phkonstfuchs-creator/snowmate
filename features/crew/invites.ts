import type { MessageKey } from "@/lib/i18n/translate";

/* Invite links: one person, one use, seven days (ADR 0009). */

export const PENDING_INVITE_KEY = "sm_pending_invite";

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function inviteUrl(siteUrl: string, token: string): string {
  return new URL(`/invite/${token}`, siteUrl).toString();
}

export type InviteStatus =
  | "valid"
  | "accepted"
  | "already_friends"
  | "self"
  | "used"
  | "expired"
  | "not_found"
  | "profile_incomplete";

export const INVITE_MESSAGES: Record<Exclude<InviteStatus, "valid">, MessageKey> = {
  accepted: "invite.accepted",
  already_friends: "crew.alreadyFriends",
  self: "invite.self",
  used: "invite.used",
  expired: "invite.expired",
  not_found: "invite.notFound",
  profile_incomplete: "common.profileIncomplete",
};

export function isInviteStatus(value: unknown): value is InviteStatus {
  return typeof value === "string" && (value === "valid" || value in INVITE_MESSAGES);
}
