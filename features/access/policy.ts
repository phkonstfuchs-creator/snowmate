export type Relationship =
  | "unrelated"
  | "friend-of-friend"
  | "pending"
  | "friend"
  | "accepted-ride-participant";

export type DiscoveryAudience = "friends" | "friends-of-friends";

export interface AccessContext {
  viewerId: string;
  ownerId: string;
  ownerIsMinor: boolean;
  relationship: Relationship;
  isBlocked: boolean;
}

function isSelf(context: AccessContext): boolean {
  return context.viewerId === context.ownerId;
}

function isConfirmedFriend(context: AccessContext): boolean {
  return context.relationship === "friend";
}

function canUseRelationship(context: AccessContext): boolean {
  return !context.isBlocked;
}

export function canDiscoverProfile(context: AccessContext): boolean {
  if (!canUseRelationship(context)) return false;
  if (isSelf(context) || isConfirmedFriend(context)) return true;

  return (
    !context.ownerIsMinor && context.relationship === "friend-of-friend"
  );
}

export function canDiscoverRide(
  context: AccessContext,
  audience: DiscoveryAudience,
): boolean {
  if (!canUseRelationship(context)) return false;
  if (isSelf(context) || isConfirmedFriend(context)) return true;

  return (
    !context.ownerIsMinor &&
    audience === "friends-of-friends" &&
    context.relationship === "friend-of-friend"
  );
}

export function canViewResortPresence(
  context: AccessContext,
  audience: DiscoveryAudience,
): boolean {
  return canDiscoverRide(context, audience);
}

export function canViewExactRideDetails(context: AccessContext): boolean {
  if (!canUseRelationship(context)) return false;
  if (isSelf(context) || isConfirmedFriend(context)) return true;

  return (
    !context.ownerIsMinor &&
    context.relationship === "accepted-ride-participant"
  );
}

export function canViewLiveLocation(context: AccessContext): boolean {
  return canViewExactRideDetails(context);
}

export function canDirectMessage(context: AccessContext): boolean {
  return canUseRelationship(context) && isConfirmedFriend(context);
}
