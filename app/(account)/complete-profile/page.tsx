import { redirect } from "next/navigation";
import { getProfileAccessDecision } from "@/features/profile/access";
import { getCurrentProfileContext } from "@/features/profile/data";
import ProfileSetupScreen from "@/features/profile/ProfileSetupScreen";
import ProfileUnavailable from "@/features/profile/ProfileUnavailable";

export default async function CompleteProfilePage() {
  const context = await getCurrentProfileContext();
  const decision = getProfileAccessDecision(context);

  if (decision === "login") {
    redirect("/login");
  }

  if (decision === "allow") {
    redirect("/feed");
  }

  if (decision === "unavailable") {
    return <ProfileUnavailable />;
  }

  const profile = context.status === "authenticated" ? context.profile : null;

  return (
    <ProfileSetupScreen
      initialValues={{
        displayName: profile?.displayName ?? "",
        handle: profile?.handle ?? "",
        city: profile?.city ?? "",
        abilityLevel: profile?.abilityLevel ?? "",
      }}
    />
  );
}
