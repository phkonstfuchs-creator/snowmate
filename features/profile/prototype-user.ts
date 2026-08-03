import type { User } from "@/lib/types";
import type { CompletedProfile } from "./model";

export function profileInitials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("de-DE"))
    .join("");
}

export function createPrototypeCurrentUser(
  profile: CompletedProfile,
  prototypeUser: User,
): User {
  return {
    ...prototypeUser,
    name: profile.displayName,
    handle: profile.handle,
    avatar: profileInitials(profile.displayName),
    city: profile.city,
  };
}
