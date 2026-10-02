import { createClient } from "@/lib/supabase/server";
import { toOwnProfile, type OwnProfile, type ProfileRow } from "./profile-input";

/* Reads the signed-in account's own profile. RLS only ever returns the
   caller's row; the id filter keeps the intent explicit. Returns null
   when signed out or when the backend is unreachable, so callers can
   fall back instead of crashing the page. */
export async function getOwnProfile(): Promise<OwnProfile | null> {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, handle, city, ability_level, bio, birth_date, is_minor, onboarding_completed")
      .eq("id", userId)
      .maybeSingle<ProfileRow>();

    if (error || !data) {
      return null;
    }

    return toOwnProfile(data);
  } catch {
    return null;
  }
}

/* Switches the caller to adult once their 18th birthday has passed
   (refresh_my_age only ever lifts the minor flag, and only for a stored
   birth date). Runs on every signed-in page; failures are ignored because
   staying a minor a little longer only restricts. */
export async function refreshOwnAge(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("refresh_my_age");
  } catch {
    // Fail closed: the stored flag stays as it is.
  }
}
