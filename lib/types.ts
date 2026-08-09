export type City = "innsbruck" | "salzburg";
export type AbilityLevel = "chill" | "park" | "off-piste";
export type AccountType = "standard" | "verified" | "guide";
export type FriendStatus = "friend" | "pending" | "suggested";
export type CarpoolRole = "driver" | "rider";
export type BadgeRarity = "common" | "rare" | "epic";

/* "friends" is the existing visibility: friends and friends of
   friends only. "public" opens the ride to everyone, strangers
   included — which is why a stricter meeting-point rule hangs off
   it (see features/rides/visibility.ts). */
export type RideVisibility = "friends" | "public";

export type FriendRequestState = "none" | "sent" | "accepted" | "declined";

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  city: City;
  level: number;
  levelTitle: string;
  xp: number;
  xpToNext: number;
  isMinor: boolean;
  accountType: AccountType;
  daysThisSeason: number;
  resortsVisited: number;
  friendsInvited: number;
  streakWeeks: number;
  badges: string[];
  friendIds: string[];
  instagram?: string;
  snapchat?: string;
  bio?: string;
  favoriteResort?: string;
  isPremium?: boolean;
}

export interface RidePost {
  id: string;
  authorId: string;
  resort: string;
  city: City;
  abilityLevel: AbilityLevel;
  date: string;
  meetTime: string;
  meetPoint: string;
  totalSpots: number;
  takenSpots: number;
  joinedUserIds: string[];
  caption: string;
  postedAt: string;
  visibility: RideVisibility;
  /* Only set on public events: gives the ride its own name so it
     does not appear in the list as just a resort. */
  title?: string;
}

/* What a viewer is actually allowed to see. `meetPoint` is nullable
   on purpose: for public events only those who joined know the exact
   meeting point. */
export interface VisibleRide {
  post: Omit<RidePost, "meetPoint">;
  meetPoint: string | null;
  meetPointLocked: boolean;
}

export interface CarpoolPost {
  id: string;
  authorId: string;
  role: CarpoolRole;
  resort: string;
  city: City;
  departurePoint: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  riders: string[];
  note: string;
  postedAt: string;
}

export interface ResortStatus {
  name: string;
  city: City;
  ridersNow: number;
  chillRiders: number;
  parkRiders: number;
  offPisteRiders: number;
  conditions: "fresh" | "groomed" | "icy" | "slushy";
  liftsOpen: number;
  totalLifts: number;
  snowDepth: number;
  altitudeMax: number;
  altitudeMin: number;
  mountainShape: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  icon: string;
}

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  days: number;
  xp: number;
}

export interface Crew {
  id: string;
  name: string;
  memberIds: string[];
  city: City;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  sentAt: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  messages: Message[];
  contextType: "direct" | "ride" | "carpool";
  contextId?: string;
}
