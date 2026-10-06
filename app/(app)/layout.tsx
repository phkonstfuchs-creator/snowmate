import BottomNav from "@/components/BottomNav";
import RefreshOnResume from "@/components/RefreshOnResume";
import OnboardingDraftSync from "@/features/profile/OnboardingDraftSync";
import PendingInviteSync from "@/features/crew/PendingInviteSync";
import TrackingProvider from "@/features/tracking/TrackingProvider";
import { getPendingCounts } from "@/features/crew/queries";
import { getUnreadChatCount } from "@/features/chat/queries";
import { refreshOwnAge } from "@/features/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  /* Layouts persist across navigation; the counts refresh whenever an
     action calls router.refresh(), which every write in the app does. */
  const [pending, unreadChats] = await Promise.all([getPendingCounts(), getUnreadChatCount(), refreshOwnAge()]);

  return (
    <div className="app-shell">
      <TrackingProvider>
        <main className="page-content">{children}</main>
      </TrackingProvider>
      <BottomNav
        badges={{
          "/feed": pending.rideRequests + pending.carpoolRequests,
          "/crew": pending.friendRequests + unreadChats,
        }}
      />
      <OnboardingDraftSync />
      <RefreshOnResume />
      <PendingInviteSync />
    </div>
  );
}
