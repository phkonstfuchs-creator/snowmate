import type { FriendRequestState, User } from "@/lib/types";

/* Suche und Anfragestatus fuer den Screen "Leute finden".
   Reine Funktionen, damit die Regeln testbar bleiben und nicht in
   der Komponente verstreut liegen. */

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

/* Sucht ueber Name und Handle. Der eigene Account und bestehende
   Freunde fallen raus — beides waere in einer Trefferliste nur
   Rauschen. */
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

/* Vorschlaege sind Leute mit gemeinsamen Freunden, absteigend
   sortiert. Ohne gemeinsame Freunde kein Vorschlag: sonst waere es
   eine Fremdenliste, und genau das will das Produkt nicht. */
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

/* Gesendete Anfragen lassen sich zurueckziehen, entschiedene nicht.
   Eine Zusage per Klick wieder aufzuloesen waere ein anderer
   Vorgang (Freund entfernen) und gehoert nicht hierher. */
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
