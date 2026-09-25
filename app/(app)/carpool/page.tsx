import CarpoolScreen from "@/features/carpool/CarpoolScreen";
import { listCarpools } from "@/features/carpool/queries";
import { getOwnProfile } from "@/features/profile/queries";

export default async function CarpoolPage() {
  const [carpools, profile] = await Promise.all([listCarpools(), getOwnProfile()]);
  return <CarpoolScreen live={{ carpools, defaultCity: profile?.city ?? "innsbruck" }} />;
}
