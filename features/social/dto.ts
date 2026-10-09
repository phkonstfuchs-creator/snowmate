import { z } from "zod";

const uuidSchema = z.uuid();
const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const citySchema = z.enum(["innsbruck", "salzburg"]);
const abilityLevelSchema = z.enum(["chill", "park", "off-piste"]);
const handleSchema = z.string().regex(/^[a-z0-9_]{3,20}$/);
const avatarPathSchema = z.string().max(255).nullable();

const profileFields = {
  id: uuidSchema,
  display_name: z.string().min(2).max(50),
  handle: handleSchema,
  city: citySchema,
  ability_level: abilityLevelSchema,
  avatar_path: avatarPathSchema,
} as const;

const discoveryProfileRowSchema = z
  .object({
    ...profileFields,
    relationship: z.enum(["friend", "friend-of-friend"]),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    city: row.city,
    abilityLevel: row.ability_level,
    avatarPath: row.avatar_path,
    relationship: row.relationship,
  }));

const friendshipRowSchema = z
  .object({
    friendship_id: uuidSchema,
    other_user_id: uuidSchema,
    display_name: z.string().min(2).max(50),
    handle: handleSchema,
    city: citySchema,
    ability_level: abilityLevelSchema,
    avatar_path: avatarPathSchema,
    status: z.enum(["pending", "accepted", "declined"]),
    direction: z.enum(["incoming", "outgoing"]),
    created_at: timestampSchema,
    responded_at: timestampSchema.nullable(),
  })
  .strict()
  .transform((row) => ({
    friendshipId: row.friendship_id,
    profile: {
      id: row.other_user_id,
      displayName: row.display_name,
      handle: row.handle,
      city: row.city,
      abilityLevel: row.ability_level,
      avatarPath: row.avatar_path,
    },
    status: row.status,
    direction: row.direction,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }));

const blockedProfileRowSchema = z
  .object({
    id: uuidSchema,
    display_name: z.string().min(2).max(50),
    handle: handleSchema,
    avatar_path: avatarPathSchema,
    blocked_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    avatarPath: row.avatar_path,
    blockedAt: row.blocked_at,
  }));

const crewRowSchema = z
  .object({
    id: uuidSchema,
    name: z.string().min(2).max(40),
    city: citySchema,
    own_role: z.enum(["owner", "admin", "member"]),
    member_count: z.number().int().positive(),
    created_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    ownRole: row.own_role,
    memberCount: row.member_count,
    createdAt: row.created_at,
  }));

const crewMemberRowSchema = z
  .object({
    user_id: uuidSchema,
    display_name: z.string().min(2).max(50),
    handle: handleSchema,
    avatar_path: avatarPathSchema,
    role: z.enum(["owner", "admin", "member"]),
    joined_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    avatarPath: row.avatar_path,
    role: row.role,
    joinedAt: row.joined_at,
  }));

const crewInvitationRowSchema = z
  .object({
    invitation_id: uuidSchema,
    crew_id: uuidSchema,
    crew_name: z.string().min(2).max(40),
    invited_by_user_id: uuidSchema,
    invited_by_display_name: z.string().min(2).max(50),
    status: z.enum(["pending", "accepted", "declined", "cancelled"]),
    created_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    invitationId: row.invitation_id,
    crewId: row.crew_id,
    crewName: row.crew_name,
    invitedByUserId: row.invited_by_user_id,
    invitedByDisplayName: row.invited_by_display_name,
    status: row.status,
    createdAt: row.created_at,
  }));

export type DiscoveryProfile = z.output<typeof discoveryProfileRowSchema>;
export type Friendship = z.output<typeof friendshipRowSchema>;
export type BlockedProfile = z.output<typeof blockedProfileRowSchema>;
export type Crew = z.output<typeof crewRowSchema>;
export type CrewMember = z.output<typeof crewMemberRowSchema>;
export type CrewInvitation = z.output<typeof crewInvitationRowSchema>;

export function parseDiscoveryProfileRows(
  value: unknown,
): DiscoveryProfile[] | null {
  const parsed = z.array(discoveryProfileRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseFriendshipRows(value: unknown): Friendship[] | null {
  const parsed = z.array(friendshipRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseBlockedProfileRows(
  value: unknown,
): BlockedProfile[] | null {
  const parsed = z.array(blockedProfileRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseCrewRows(value: unknown): Crew[] | null {
  const parsed = z.array(crewRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseCrewMemberRows(value: unknown): CrewMember[] | null {
  const parsed = z.array(crewMemberRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseCrewInvitationRows(
  value: unknown,
): CrewInvitation[] | null {
  const parsed = z.array(crewInvitationRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}
