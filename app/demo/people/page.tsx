import DiscoverScreen from "@/features/discovery/DiscoverScreen";
import { demoDeck } from "@/features/demo/demo-deck";
import { ME, MOCK_USERS } from "@/lib/data";

/* The same swipe screen as the app (ADR 0003, 0028), on fixtures. */
export default function DemoPeoplePage() {
  return <DiscoverScreen initialDeck={demoDeck(ME, MOCK_USERS)} discoverable={false} hasBirthDate isMinor={ME.isMinor} demo />;
}
