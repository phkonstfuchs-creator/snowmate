import BottomNav from "@/components/BottomNav";
import OnboardingDraftSync from "@/features/profile/OnboardingDraftSync";
import PendingInviteSync from "@/features/crew/PendingInviteSync";
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
      <main className="page-content">{children}</main>
      <BottomNav
        badges={{
          "/feed": pending.rideRequests,
          "/crew": pending.friendRequests + unreadChats,
          "/carpool": pending.carpoolRequests,
        }}
      />
      <OnboardingDraftSync />
      <PendingInviteSync />
    </div>
  );
}
