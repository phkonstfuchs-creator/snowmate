import type { FriendRequestState, User } from "@/lib/types";

/* Search and request state for the "Find people" screen. Pure
   functions, so the rules stay testable instead of being scattered
   through the component. */

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

/* Searches name and handle. Your own account and existing friends
   drop out — both would be noise in a result list. */
export function searchPeople(
  users: readonly User[],
  rawQuery: string,
  viewer: Pick<User, "id" | "friendIds">,
): User[] {
  const query = normalizeQuery(rawQuery);
  const excluded = new Set([viewer.id, ...viewer.friendIds]);
  const candidates = users.filter((user) => !excluded.has(user.id));

  if (query.length === 0) return candidates;

  return candidates.filter(
    (user) =>
      user.name.toLowerCase().includes(query) ||
      user.handle.toLowerCase().includes(query),
  );
}

/* Suggestions are people with mutual friends, sorted descending.
   No mutual friends means no suggestion: otherwise it would be a
   list of strangers, which is exactly what this product avoids. */
export function suggestPeople(
  users: readonly User[],
  viewer: Pick<User, "id" | "friendIds">,
  limit = 4,
): { user: User; mutualCount: number }[] {
  const viewerFriends = new Set(viewer.friendIds);
  const excluded = new Set([viewer.id, ...viewer.friendIds]);

  return users
    .filter((user) => !excluded.has(user.id))
    .map((user) => ({
      user,
      mutualCount: user.friendIds.filter((id) => viewerFriends.has(id)).length,
    }))
    .filter((entry) => entry.mutualCount > 0)
    .sort((a, b) => b.mutualCount - a.mutualCount)
    .slice(0, limit);
}

export function countMutualFriends(
  candidate: Pick<User, "friendIds">,
  viewer: Pick<User, "friendIds">,
): number {
  const viewerFriends = new Set(viewer.friendIds);
  return candidate.friendIds.filter((id) => viewerFriends.has(id)).length;
}

export type RequestLedger = Readonly<Record<string, FriendRequestState>>;

export function getRequestState(
  ledger: RequestLedger,
  userId: string,
): FriendRequestState {
  return ledger[userId] ?? "none";
}

/* Sent requests can be withdrawn, decided ones cannot. Undoing an
   acceptance with one click is a different operation (remove
   friend) and does not belong here. */
export function toggleOutgoingRequest(
  ledger: RequestLedger,
  userId: string,
): RequestLedger {
  const current = getRequestState(ledger, userId);
  if (current === "accepted" || current === "declined") return ledger;

  return { ...ledger, [userId]: current === "sent" ? "none" : "sent" };
}

export function resolveIncomingRequest(
  ledger: RequestLedger,
  userId: string,
  decision: "accepted" | "declined",
): RequestLedger {
  return { ...ledger, [userId]: decision };
}
