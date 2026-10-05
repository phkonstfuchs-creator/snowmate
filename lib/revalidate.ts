import { revalidatePath } from "next/cache";

/* After a write, every signed-in screen may show the change (a join
   changes the feed, the map counts, the crew's ride chats, the profile
   stats). Invalidate them all: cheap at this scale, and nobody sees a
   stale tab after their own action. */
export function revalidateApp(): void {
  revalidatePath("/", "layout");
}
