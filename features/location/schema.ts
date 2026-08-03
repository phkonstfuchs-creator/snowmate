import { z } from "zod";

const uuidSchema = z.uuid("Ungültige Kennung.");

export const startLocationSessionSchema = z
  .object({
    resortId: z
      .string()
      .regex(/^[a-z0-9-]{2,64}$/, "Wähle ein gültiges Skigebiet."),
    audience: z.enum(["friends", "ride"]),
    rideId: uuidSchema.optional(),
    durationHours: z.number().int().min(1).max(8).default(4),
    idempotencyKey: uuidSchema,
  })
  .superRefine((value, context) => {
    if (value.audience === "ride" && !value.rideId) {
      context.addIssue({
        code: "custom",
        path: ["rideId"],
        message: "Eine Ride-Session benötigt eine Ausfahrt.",
      });
    }
    if (value.audience === "friends" && value.rideId) {
      context.addIssue({
        code: "custom",
        path: ["rideId"],
        message: "Freundes-Sessions sind nicht an eine Ausfahrt gebunden.",
      });
    }
  });

export function createLocationUpdateSchema(now = new Date()) {
  const nowTimestamp = now.getTime();

  return z.object({
    sessionId: uuidSchema,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().positive().max(1000),
    capturedAt: z.string().refine((value) => {
      const timestamp = Date.parse(value);
      return (
        Number.isFinite(timestamp) &&
        timestamp >= nowTimestamp - 120_000 &&
        timestamp <= nowTimestamp + 30_000
      );
    }, "Standortupdate ist veraltet oder liegt in der Zukunft."),
  });
}

export type StartLocationSessionInput = z.infer<
  typeof startLocationSessionSchema
>;
export type LocationUpdateInput = z.infer<
  ReturnType<typeof createLocationUpdateSchema>
>;
