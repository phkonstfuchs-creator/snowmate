/* Swipe to meet riders (ADR 0028). The database decides who is in the
   deck: opt-in, same age band, same region, and under 18 only friends of
   friends. */

export interface DeckCard {
  userId: string;
  name: string;
  abilityLevel: string | null;
  ridingStyles: string[];
  bio: string | null;
  mutualFriends: number;
}

export interface DeckRow {
  user_id: string;
  display_name: string | null;
  ability_level: string | null;
  riding_styles: string[] | null;
  bio: string | null;
  mutual_friends: number | null;
}

export type SwipeOutcome = "matched" | "liked" | "passed" | "invalid" | "rate_limited" | "unauthenticated" | "unavailable";

export const SWIPE_OUTCOMES: readonly SwipeOutcome[] = ["matched", "liked", "passed", "invalid", "rate_limited", "unauthenticated"];

export function toDeckCard(row: DeckRow): DeckCard {
  return {
    userId: row.user_id,
    name: row.display_name ?? "Rider",
    abilityLevel: row.ability_level,
    ridingStyles: row.riding_styles ?? [],
    bio: row.bio,
    mutualFriends: row.mutual_friends ?? 0,
  };
}

/* How far a card must be dragged (px) to count as a swipe. */
export const SWIPE_THRESHOLD = 100;

export function swipeDirection(dx: number): "like" | "pass" | null {
  if (dx >= SWIPE_THRESHOLD) return "like";
  if (dx <= -SWIPE_THRESHOLD) return "pass";
  return null;
}
