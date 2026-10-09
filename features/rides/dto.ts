import { z } from "zod";

const uuidSchema = z.uuid();
const citySchema = z.enum(["innsbruck", "salzburg"]);
const abilityLevelSchema = z.enum(["chill", "park", "off-piste"]);
const audienceSchema = z.enum(["friends", "friends-of-friends"]);
const statusSchema = z.enum(["scheduled", "active", "completed", "cancelled"]);
const timestampSchema = z.string().refine((value) => Number.isFinite(Date.parse(value)));

const hostFields = {
  host_id: uuidSchema,
  host_display_name: z.string().min(2).max(50),
  host_handle: z.string().regex(/^[a-z0-9_]{3,20}$/),
  host_avatar_path: z.string().max(255).nullable(),
} as const;

const rideFields = {
  id: uuidSchema,
  ...hostFields,
  resort_id: z.string().regex(/^[a-z0-9-]{2,64}$/),
  resort_name: z.string().min(2).max(100),
  city: citySchema,
  ability_level: abilityLevelSchema,
  starts_at: timestampSchema,
  capacity: z.number().int().min(2).max(12),
  taken_spots: z.number().int().nonnegative(),
  audience: audienceSchema,
  caption: z.string().max(500),
  status: statusSchema,
  created_at: timestampSchema,
} as const;

function mapRide(row: z.infer<z.ZodObject<typeof rideFields>>) {
  return {
    id: row.id,
    host: {
      id: row.host_id,
      displayName: row.host_display_name,
      handle: row.host_handle,
      avatarPath: row.host_avatar_path,
    },
    resort: { id: row.resort_id, name: row.resort_name },
    city: row.city,
    abilityLevel: row.ability_level,
    startsAt: row.starts_at,
    capacity: row.capacity,
    takenSpots: row.taken_spots,
    audience: row.audience,
    caption: row.caption,
    status: row.status,
    createdAt: row.created_at,
  } as const;
}

const rideFeedRowSchema = z.object(rideFields).strict().transform(mapRide);
const rideDetailRowSchema = z
  .object({
    ...rideFields,
    meeting_point: z.string().min(2).max(200).nullable(),
    can_view_exact: z.boolean(),
  })
  .strict()
  .transform((row) => ({
    ...mapRide(row),
    meetingPoint: row.meeting_point,
    canViewExact: row.can_view_exact,
  }));

const carpoolFields = {
  id: uuidSchema,
  ...hostFields,
  resort_id: z.string().regex(/^[a-z0-9-]{2,64}$/),
  resort_name: z.string().min(2).max(100),
  city: citySchema,
  role: z.enum(["driver", "rider"]),
  departs_at: timestampSchema,
  seat_capacity: z.number().int().min(1).max(8),
  available_seats: z.number().int().min(0).max(8),
  audience: audienceSchema,
  note: z.string().max(300),
  status: statusSchema,
  created_at: timestampSchema,
} as const;

function mapCarpool(row: z.infer<z.ZodObject<typeof carpoolFields>>) {
  return {
    id: row.id,
    host: {
      id: row.host_id,
      displayName: row.host_display_name,
      handle: row.host_handle,
      avatarPath: row.host_avatar_path,
    },
    resort: { id: row.resort_id, name: row.resort_name },
    city: row.city,
    role: row.role,
    departsAt: row.departs_at,
    seatCapacity: row.seat_capacity,
    availableSeats: row.available_seats,
    audience: row.audience,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
  } as const;
}

const carpoolFeedRowSchema = z
  .object(carpoolFields)
  .strict()
  .transform(mapCarpool);
const carpoolDetailRowSchema = z
  .object({
    ...carpoolFields,
    departure_point: z.string().min(2).max(200).nullable(),
    can_view_exact: z.boolean(),
  })
  .strict()
  .transform((row) => ({
    ...mapCarpool(row),
    departurePoint: row.departure_point,
    canViewExact: row.can_view_exact,
  }));

const memberProfileFields = {
  user_id: uuidSchema,
  display_name: z.string().min(2).max(50),
  handle: z.string().regex(/^[a-z0-9_]{3,20}$/),
  avatar_path: z.string().max(255).nullable(),
} as const;

function mapMemberProfile(row: z.infer<z.ZodObject<typeof memberProfileFields>>) {
  return {
    id: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    avatarPath: row.avatar_path,
  } as const;
}

const rideMemberRowSchema = z
  .object({
    ride_id: uuidSchema,
    ...memberProfileFields,
    role: z.enum(["host", "participant"]),
    joined_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    rideId: row.ride_id,
    profile: mapMemberProfile(row),
    role: row.role,
    joinedAt: row.joined_at,
  }));

const carpoolMemberRowSchema = z
  .object({
    carpool_id: uuidSchema,
    ...memberProfileFields,
    joined_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    carpoolId: row.carpool_id,
    profile: mapMemberProfile(row),
    joinedAt: row.joined_at,
  }));

const requestProfileFields = {
  requester_id: uuidSchema,
  requester_display_name: z.string().min(2).max(50),
  requester_handle: z.string().regex(/^[a-z0-9_]{3,20}$/),
  requester_avatar_path: z.string().max(255).nullable(),
} as const;
const requestFields = {
  id: uuidSchema,
  ...requestProfileFields,
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  created_at: timestampSchema,
  responded_at: timestampSchema.nullable(),
} as const;

function mapRequestProfile(row: z.infer<z.ZodObject<typeof requestProfileFields>>) {
  return {
    id: row.requester_id,
    displayName: row.requester_display_name,
    handle: row.requester_handle,
    avatarPath: row.requester_avatar_path,
  } as const;
}

const rideRequestRowSchema = z
  .object({ ride_id: uuidSchema, ...requestFields })
  .strict()
  .transform((row) => ({
    id: row.id,
    rideId: row.ride_id,
    requester: mapRequestProfile(row),
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }));

const carpoolRequestRowSchema = z
  .object({ carpool_id: uuidSchema, ...requestFields })
  .strict()
  .transform((row) => ({
    id: row.id,
    carpoolId: row.carpool_id,
    requester: mapRequestProfile(row),
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }));

export type RideFeed = z.output<typeof rideFeedRowSchema>;
export type RideDetail = z.output<typeof rideDetailRowSchema>;
export type CarpoolFeed = z.output<typeof carpoolFeedRowSchema>;
export type CarpoolDetail = z.output<typeof carpoolDetailRowSchema>;
export type RideMember = z.output<typeof rideMemberRowSchema>;
export type CarpoolMember = z.output<typeof carpoolMemberRowSchema>;
export type RideRequest = z.output<typeof rideRequestRowSchema>;
export type CarpoolRequest = z.output<typeof carpoolRequestRowSchema>;

export function parseRideFeedRows(value: unknown): RideFeed[] | null {
  const result = z.array(rideFeedRowSchema).safeParse(value);
  return result.success ? result.data : null;
}

export function parseRideDetailRow(value: unknown): RideDetail | null {
  const result = rideDetailRowSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseCarpoolFeedRows(value: unknown): CarpoolFeed[] | null {
  const result = z.array(carpoolFeedRowSchema).safeParse(value);
  return result.success ? result.data : null;
}

export function parseCarpoolDetailRow(value: unknown): CarpoolDetail | null {
  const result = carpoolDetailRowSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseRideMemberRows(value: unknown): RideMember[] | null {
  const result = z.array(rideMemberRowSchema).safeParse(value);
  return result.success ? result.data : null;
}

export function parseCarpoolMemberRows(value: unknown): CarpoolMember[] | null {
  const result = z.array(carpoolMemberRowSchema).safeParse(value);
  return result.success ? result.data : null;
}

export function parseRideRequestRows(value: unknown): RideRequest[] | null {
  const result = z.array(rideRequestRowSchema).safeParse(value);
  return result.success ? result.data : null;
}

export function parseCarpoolRequestRows(value: unknown): CarpoolRequest[] | null {
  const result = z.array(carpoolRequestRowSchema).safeParse(value);
  return result.success ? result.data : null;
}
