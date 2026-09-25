import ProfileScreen from "@/features/profile/ProfileScreen";
import { getOwnProfile } from "@/features/profile/queries";

export default async function ProfilePage() {
  const account = await getOwnProfile();
  return <ProfileScreen account={account} />;
}
