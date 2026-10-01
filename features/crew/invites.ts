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

export const INVITE_MESSAGES: Record<Exclude<InviteStatus, "valid">, string> = {
  accepted: "You are friends now.",
  already_friends: "You are already friends.",
  self: "This is your own invite link. Send it to a friend.",
  used: "This link has already been used. Ask for a new one.",
  expired: "This link has expired. Ask for a new one.",
  not_found: "This invite link does not work.",
  profile_incomplete: "Finish your profile first: add your name and handle on the Profile tab.",
};

export function isInviteStatus(value: unknown): value is InviteStatus {
  return typeof value === "string" && (value === "valid" || value in INVITE_MESSAGES);
}
