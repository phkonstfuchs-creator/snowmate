import type { Metadata } from "next";
import InviteScreen from "@/features/crew/InviteScreen";
import { previewInvite } from "@/features/crew/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Crew invite · Pistl",
  robots: { index: false },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <InviteScreen token={token} />;
  }

  return <InviteScreen token={token} preview={await previewInvite(token)} />;
}
