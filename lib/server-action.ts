import "server-only";

import { createClient } from "@/lib/supabase/server";

/* Shared plumbing for features/<f>/actions.ts. Deliberately not a
   "use server" module: nothing here may become a callable endpoint. */

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/* Calls a security-definer function that answers with one of a fixed set
   of outcome strings. Anything else, an error or a throw becomes
   "unavailable", so a changed database never leaks through to the UI.
   `onAnswer` runs for known outcomes, e.g. to revalidate or send push. */
export async function rpcOutcome<O extends string>(
  fn: string,
  args: Record<string, unknown> | undefined,
  known: readonly O[],
  onAnswer?: (outcome: O, supabase: ServerClient) => unknown,
): Promise<O | "unavailable"> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(fn, args);
    if (error || !known.includes(data as O)) return "unavailable";
    await onAnswer?.(data as O, supabase);
    return data as O;
  } catch {
    return "unavailable";
  }
}
