export interface DispatchIdentity {
  userId: string;
  sessionId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Call only after Supabase Auth has verified this exact bearer token. */
export function identityFromVerifiedToken(token: string, verifiedUserId: string): DispatchIdentity | null {
  try {
    const segments = token.split(".");
    if (segments.length !== 3 || !UUID.test(verifiedUserId)) return null;
    const encoded = segments[1]!;
    const claims: unknown = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof claims !== "object" || claims === null) return null;
    const { sub, role, session_id: sessionId } = claims as Record<string, unknown>;
    if (sub !== verifiedUserId || role !== "authenticated" || typeof sessionId !== "string" || !UUID.test(sessionId)) return null;
    return { userId: verifiedUserId, sessionId };
  } catch {
    return null;
  }
}
