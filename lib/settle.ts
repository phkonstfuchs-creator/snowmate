/* A server action called from the client rejects when the request itself
   fails (offline, deploy in progress). Callers track pending state around
   the await, so a rejection must become an ordinary failed result instead
   of leaving buttons disabled until a reload. */
export async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export const OFFLINE_RESULT = { ok: false, message: "No connection. Try again in a moment." } as const;
