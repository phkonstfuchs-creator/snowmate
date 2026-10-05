import { createClient } from "@/lib/supabase/server";
import { toOwnProfile, type OwnProfile, type ProfileRow } from "./profile-input";
import { AVATAR_BUCKET } from "./avatar-image";

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
      .select("id, display_name, handle, city, ability_level, riding_styles, bio, birth_date, is_minor, onboarding_completed, avatar_path, avatar_visibility")
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

/* Whether the account has a verified authenticator app. null when it
   could not be checked. */
export async function getMfaEnabled(): Promise<boolean | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return null;
    return data.totp.some((factor) => factor.status === "verified");
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

/* The owner's picture if the caller may see it, else null. The database
   decides (avatar_path_for); storage checks the same rule again. */
export async function getVisibleAvatar(ownerId: string): Promise<Blob | null> {
  if (!UUID.test(ownerId)) return null;
  try {
    const supabase = await createClient();
    const { data: path, error } = await supabase.rpc("avatar_path_for", { owner: ownerId });
    if (error || typeof path !== "string") return null;
    const { data: file, error: downloadError } = await supabase.storage.from(AVATAR_BUCKET).download(path);
    return downloadError || !file ? null : file;
  } catch {
    return null;
  }
}
