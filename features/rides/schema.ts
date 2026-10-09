import { z } from "zod";

const unsafeTextPattern = /[\p{Cc}\u202A-\u202E\u2066-\u2069]/u;
const uuidSchema = z.uuid("Ungültige Kennung.");
const resortIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{2,64}$/, "Wähle ein gültiges Skigebiet.");
const audienceSchema = z.enum(["friends", "friends-of-friends"]);
const abilityLevelSchema = z.enum(["chill", "park", "off-piste"]);

function safeTrimmedText(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .min(min, message)
    .max(max, message)
    .refine((value) => !unsafeTextPattern.test(value), message);
}

function futureDateSchema(now: Date) {
  const earliest = now.getTime();
  const latest = earliest + 90 * 24 * 60 * 60 * 1000;

  return z.string().refine((value) => {
    const timestamp = Date.parse(value);
    return (
      Number.isFinite(timestamp) && timestamp > earliest && timestamp <= latest
    );
  }, "Datum muss innerhalb der nächsten 90 Tage liegen.");
}

export function createRideInputSchema(now = new Date()) {
  return z.object({
    resortId: resortIdSchema,
    abilityLevel: abilityLevelSchema,
    startsAt: futureDateSchema(now),
    capacity: z.number().int().min(2).max(12),
    audience: audienceSchema,
    caption: safeTrimmedText(0, 500, "Notiz enthält ungültigen Text."),
    meetingPoint: safeTrimmedText(
      2,
      200,
      "Treffpunkt muss 2–200 sichere Zeichen enthalten.",
    ),
    idempotencyKey: uuidSchema,
  }).strict();
}

export function createCarpoolInputSchema(now = new Date()) {
  return z
    .object({
      resortId: resortIdSchema,
      city: z.enum(["innsbruck", "salzburg"]),
      role: z.enum(["driver", "rider"]),
      departureAt: futureDateSchema(now),
      totalSeats: z.number().int().min(1).max(8),
      audience: audienceSchema,
      note: safeTrimmedText(0, 300, "Notiz enthält ungültigen Text."),
      departurePoint: safeTrimmedText(
        2,
        200,
        "Abfahrtsort muss 2–200 sichere Zeichen enthalten.",
      ),
      idempotencyKey: uuidSchema,
    })
    .strict()
    .superRefine((value, context) => {
      if (value.role === "rider" && value.totalSeats !== 1) {
        context.addIssue({
          code: "custom",
          path: ["totalSeats"],
          message: "Eine Platzsuche steht immer für eine Person.",
        });
      }
    });
}

export const requestRideInputSchema = z.object({
  rideId: uuidSchema,
  idempotencyKey: uuidSchema,
}).strict();

export const respondRideRequestInputSchema = z.object({
  requestId: uuidSchema,
  accept: z.boolean(),
  idempotencyKey: uuidSchema,
}).strict();

export const requestCarpoolInputSchema = z.object({
  carpoolId: uuidSchema,
  idempotencyKey: uuidSchema,
}).strict();

export const respondCarpoolRequestInputSchema = z.object({
  requestId: uuidSchema,
  accept: z.boolean(),
  idempotencyKey: uuidSchema,
}).strict();

export const leaveRideInputSchema = requestRideInputSchema;
export const cancelRideInputSchema = requestRideInputSchema;
export const leaveCarpoolInputSchema = requestCarpoolInputSchema;
export const cancelCarpoolInputSchema = requestCarpoolInputSchema;

export type CreateRideInput = z.infer<ReturnType<typeof createRideInputSchema>>;
export type CreateCarpoolInput = z.infer<
  ReturnType<typeof createCarpoolInputSchema>
>;
