import LiveCrewScreen from "@/features/crew/LiveCrewScreen";
import { getFriendGraph } from "@/features/crew/queries";

export default async function CrewPage() {
  const graph = await getFriendGraph();
  return <LiveCrewScreen graph={graph} />;
}
