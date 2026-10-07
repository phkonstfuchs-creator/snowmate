"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDeleteConfirmation, type DeleteAccountState } from "./action-state";
import { getT } from "@/lib/i18n/server";
import { AVATAR_BUCKET } from "./avatar-image";
import { POST_PHOTO_BUCKET } from "@/features/posts/post";

/* GDPR art. 17. delete_my_account() removes the auth user, which
   cascades through every table that references the profile. */
export async function deleteAccountAction(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirmation = formData.get("confirmation");
  const t = await getT();

  if (typeof confirmation !== "string" || !isDeleteConfirmation(confirmation)) {
    return { status: "error", message: t("profile.typeToConfirm", { word: t("profile.deleteWord") }) };
  }

  const supabase = await createClient();

  /* Storage is a separate service: finish cleanup before deleting its
     owner. The RPC independently refuses while any own object remains. */
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return { status: "error", message: t("profile.deleteFailed") };
    for (const bucket of [AVATAR_BUCKET, POST_PHOTO_BUCKET]) {
      if (!await removeFolder(supabase, bucket, data.user.id)) {
        return { status: "error", message: t("profile.deleteFailed") };
      }
    }
  } catch {
    return { status: "error", message: t("profile.deleteFailed") };
  }

  try {
    const { data, error } = await supabase.rpc("delete_my_account");

    if (error || data !== true) {
      return { status: "error", message: t("profile.deleteFailed") };
    }
  } catch {
    return { status: "error", message: t("profile.deleteFailed") };
  }

  try {
    /* The user is gone server-side; this only clears the local cookies. */
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Protected routes fail closed without a valid user anyway.
  }

  redirect("/login?account=deleted");
}

/* Lists come back in pages; a bounded loop empties even a long post
   history without risking an endless retry on a failing remove. */
async function removeFolder(supabase: Awaited<ReturnType<typeof createClient>>, bucket: string, userId: string) {
  for (let round = 0; round < 20; round += 1) {
    const { data: files, error: listError } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (listError || !files) return false;
    if (files.length === 0) return true;
    const { error } = await supabase.storage.from(bucket).remove(files.map((file) => `${userId}/${file.name}`));
    if (error) return false;
  }
  return false;
}
