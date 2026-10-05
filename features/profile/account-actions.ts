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

  /* Storage files do not cascade with the account: remove the picture
     and the post photos first. If this fails the account is still
     deleted; the operator cleans up orphaned files (the folder name is
     the deleted id). */
  try {
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (typeof userId === "string") {
      for (const bucket of [AVATAR_BUCKET, POST_PHOTO_BUCKET]) {
        await removeFolder(supabase, bucket, userId);
      }
    }
  } catch {
    // Not a reason to keep the account.
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
    const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (!files || files.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(files.map((file) => `${userId}/${file.name}`));
    if (error) return;
  }
}
