"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DELETE_CONFIRMATION, type DeleteAccountState } from "./action-state";

/* GDPR art. 17. delete_my_account() removes the auth user, which
   cascades through every table that references the profile. */
export async function deleteAccountAction(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirmation = formData.get("confirmation");

  if (typeof confirmation !== "string" || confirmation.trim().toLowerCase() !== DELETE_CONFIRMATION) {
    return { status: "error", message: `Type "${DELETE_CONFIRMATION}" to confirm.` };
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("delete_my_account");

    if (error || data !== true) {
      return { status: "error", message: "Your account could not be deleted. Try again shortly." };
    }
  } catch {
    return { status: "error", message: "Your account could not be deleted. Try again shortly." };
  }

  try {
    /* The user is gone server-side; this only clears the local cookies. */
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Protected routes fail closed without a valid user anyway.
  }

  redirect("/login?account=deleted");
}
