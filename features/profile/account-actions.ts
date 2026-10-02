"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDeleteConfirmation, type DeleteAccountState } from "./action-state";
import { getT } from "@/lib/i18n/server";

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
