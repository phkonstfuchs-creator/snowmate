import { z } from "zod";

const uuidSchema = z.uuid();
const timestampSchema = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const handleSchema = z.string().regex(/^[a-z0-9_]{3,20}$/);
const avatarPathSchema = z.string().max(255).nullable();
const resortIdSchema = z.string().regex(/^[a-z0-9-]{2,64}$/);

const resortPresenceRowSchema = z
  .object({
    user_id: uuidSchema,
    display_name: z.string().min(2).max(50),
    handle: handleSchema,
    avatar_path: avatarPathSchema,
    resort_id: resortIdSchema,
    resort_name: z.string().min(2).max(100),
    city: z.enum(["innsbruck", "salzburg"]),
    last_seen_at: timestampSchema,
    relationship: z.enum(["self", "friend", "friend-of-friend"]),
  })
  .strict()
  .transform((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    avatarPath: row.avatar_path,
    resort: { id: row.resort_id, name: row.resort_name },
    city: row.city,
    lastSeenAt: row.last_seen_at,
    relationship: row.relationship,
  }));

const liveLocationRowSchema = z
  .object({
    session_id: uuidSchema,
    user_id: uuidSchema,
    display_name: z.string().min(2).max(50),
    handle: handleSchema,
    avatar_path: avatarPathSchema,
    resort_id: resortIdSchema,
    ride_id: uuidSchema.nullable(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracy_meters: z.number().finite().positive().max(1000),
    observed_at: timestampSchema,
  })
  .strict()
  .transform((row) => ({
    sessionId: row.session_id,
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    avatarPath: row.avatar_path,
    resortId: row.resort_id,
    rideId: row.ride_id,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude,
      accuracyMeters: row.accuracy_meters,
    },
    observedAt: row.observed_at,
  }));

export type ResortPresence = z.output<typeof resortPresenceRowSchema>;
export type LiveLocation = z.output<typeof liveLocationRowSchema>;

export function parseResortPresenceRows(
  value: unknown,
): ResortPresence[] | null {
  const parsed = z.array(resortPresenceRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseLiveLocationRows(value: unknown): LiveLocation[] | null {
  const parsed = z.array(liveLocationRowSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}
