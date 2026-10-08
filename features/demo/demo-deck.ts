import type { User } from "@/lib/types";
import type { DeckCard } from "@/features/discovery/discovery";

/* The /demo swipe deck from fixtures, following the live rules of
   ADR 0028 as far as fixtures allow: never a friend, the same age band
   and the same region. So the demo never shows a minor to a stranger. */
export function demoDeck(me: User, users: readonly User[]): DeckCard[] {
  return users
    .filter((user) => user.id !== me.id && !me.friendIds.includes(user.id))
    .filter((user) => user.isMinor === me.isMinor && user.city === me.city)
    .map((user) => ({
      userId: user.id,
      name: user.name,
      abilityLevel: null,
      ridingStyles: [],
      bio: user.bio ?? null,
      mutualFriends: user.friendIds.filter((id) => me.friendIds.includes(id)).length,
    }));
}
