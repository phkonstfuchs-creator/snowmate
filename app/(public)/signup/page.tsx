import AuthScreen from "@/features/auth/AuthScreen";
import { validatedInviteToken } from "@/features/auth/credentials";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const query = await searchParams;
  const initialInviteToken = validatedInviteToken(query.invite);

  return (
    <AuthScreen mode="signup" initialInviteToken={initialInviteToken} />
  );
}
