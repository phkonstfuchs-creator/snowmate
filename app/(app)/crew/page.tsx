import LiveCrewScreen from "@/features/crew/LiveCrewScreen";
import { getFriendGraph } from "@/features/crew/queries";
import { listMyChats } from "@/features/chat/queries";

export default async function CrewPage() {
  const [graph, chats] = await Promise.all([getFriendGraph(), listMyChats()]);
  return <LiveCrewScreen graph={graph} chats={chats} />;
}
