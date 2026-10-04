import "server-only";
import { cookies } from "next/headers";
import { PENDING_SIGNUP_COOKIE, parsePendingSignup } from "./pending-signup";

/* The address a sign-up code was sent to, if a sign-up is in progress. */
export async function getPendingSignupEmail(): Promise<string | null> {
  const store = await cookies();
  return parsePendingSignup(store.get(PENDING_SIGNUP_COOKIE)?.value);
}
