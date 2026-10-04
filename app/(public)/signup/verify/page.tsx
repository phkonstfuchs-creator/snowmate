import { redirect } from "next/navigation";
import SignupCodeScreen from "@/features/auth/SignupCodeScreen";
import { maskEmail } from "@/features/auth/pending-signup";
import { getPendingSignupEmail } from "@/features/auth/queries";

export default async function SignupVerifyPage() {
  const email = await getPendingSignupEmail();
  if (!email) redirect("/signup");
  return <SignupCodeScreen maskedEmail={maskEmail(email)} />;
}
