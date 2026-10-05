import { RESORTS } from "@/lib/resorts";
import { conditionsUrl, parseConditions, type ResortConditions } from "./conditions";

/* Snow and weather for every resort. Cached for 30 minutes and shared by
   all visitors; no user data leaves the server. null when the provider
   cannot be reached, so the map shows "no data" rather than old values. */
export async function getResortConditions(): Promise<Record<string, ResortConditions | null> | null> {
  try {
    const response = await fetch(conditionsUrl(RESORTS), {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return parseConditions(RESORTS, await response.json());
  } catch {
    return null;
  }
}
