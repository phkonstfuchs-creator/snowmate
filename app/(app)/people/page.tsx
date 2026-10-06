import DiscoverScreen from "@/features/discovery/DiscoverScreen";
import { getDeck, getDiscoverable } from "@/features/discovery/queries";
import { getOwnProfile } from "@/features/profile/queries";

/* Swipe to meet riders (ADR 0028). Who appears is decided in the
   database: opt-in, same age band and region, under 18 only friends of
   friends. */
export default async function PeoplePage() {
  const [profile, discoverable] = await Promise.all([getOwnProfile(), getDiscoverable()]);
  const deck = discoverable ? await getDeck() : [];
  return (
    <DiscoverScreen
      initialDeck={deck}
      discoverable={discoverable}
      hasBirthDate={Boolean(profile?.birthDate)}
      isMinor={profile?.isMinor !== false}
    />
  );
}
