import BottomNav from "@/components/BottomNav";
import { getProfileAccessDecision } from "@/features/profile/access";
import { CurrentProfileProvider } from "@/features/profile/CurrentProfileProvider";
import { getCurrentProfileContext } from "@/features/profile/data";
import { asCompletedProfile } from "@/features/profile/model";
import ProfileUnavailable from "@/features/profile/ProfileUnavailable";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getCurrentProfileContext();
  const decision = getProfileAccessDecision(context);

  if (decision === "login") {
    redirect("/login");
  }

  if (decision === "complete-profile") {
    redirect("/complete-profile");
  }

  if (decision === "unavailable") {
    return <ProfileUnavailable />;
  }

  const profile =
    context.status === "authenticated"
      ? asCompletedProfile(context.profile)
      : null;

  if (!profile) {
    redirect("/complete-profile");
  }

  return (
    <CurrentProfileProvider profile={profile}>
      <div className="app-shell">
        <main className="page-content">{children}</main>
        <BottomNav />
      </div>
    </CurrentProfileProvider>
  );
}
