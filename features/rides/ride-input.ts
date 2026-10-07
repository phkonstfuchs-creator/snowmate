import { z } from "zod";
import { ABILITY_VALUES, CITY_VALUES } from "@/features/profile/profile-input";
import { isPlanningDate } from "./planning-date";

/* Mirrors the constraints on public.rides. */
export const rideInputSchema = z
  .object({
    resort: z.string().trim().min(2, "v.pickResort").max(60, "v.resortTooLong"),
    city: z.enum(CITY_VALUES, "v.pickRegion"),
    abilityLevel: z.enum(ABILITY_VALUES, "v.pickStyle"),
    rideDate: z.iso.date("v.pickDate"),
    meetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "v.pickTime"),
    meetPoint: z.string().trim().min(2, "v.addMeetPoint").max(120, "v.max|120"),
    totalSpots: z.number().int().min(1, "v.minSpot").max(50, "v.maxSpots"),
    caption: z
      .string()
      .trim()
      .max(280, "v.max|280")
      .transform((value) => (value === "" ? null : value)),
    visibility: z.enum(["friends", "public"]),
    title: z
      .string()
      .trim()
      .max(60, "v.max|60")
      .transform((value) => (value === "" ? null : value))
      .optional(),
  })
  .refine((input) => input.visibility === "friends" || (input.title?.length ?? 0) >= 3, {
    message: "v.eventName",
    path: ["title"],
  });

export type RideInput = z.infer<typeof rideInputSchema>;
/* What a form hands over, before trimming and normalising. */
export type RideFormInput = z.input<typeof rideInputSchema>;

export function validateRideInput(
  input: unknown,
  now: Date = new Date(),
): { success: true; data: RideInput } | { success: false; message: string } {
  const result = rideInputSchema.safeParse(input);
  if (result.success) return isPlanningDate(result.data.rideDate, now)
    ? { success: true, data: result.data }
    : { success: false, message: "v.dateWithinYear" };
  return { success: false, message: result.error.issues[0]?.message ?? "v.checkRide" };
}

/* What a host may change after posting (see update_ride()). */
export const rideEditSchema = z.object({
  meetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "v.pickTime"),
  meetPoint: z.string().trim().min(2, "v.addMeetPoint").max(120, "v.max|120"),
  totalSpots: z.number().int().min(1, "v.minSpot").max(50, "v.maxSpots"),
  caption: z.string().trim().max(280, "v.max|280"),
});

export type RideEditInput = z.input<typeof rideEditSchema>;

export function validateRideEdit(
  input: unknown,
): { success: true; data: z.infer<typeof rideEditSchema> } | { success: false; message: string } {
  const result = rideEditSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, message: result.error.issues[0]?.message ?? "v.checkRide" };
}
