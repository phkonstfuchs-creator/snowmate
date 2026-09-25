import { z } from "zod";
import { ABILITY_VALUES, CITY_VALUES } from "@/features/profile/profile-input";

/* Mirrors the constraints on public.rides. */
export const rideInputSchema = z
  .object({
    resort: z.string().trim().min(2, "Pick a resort.").max(60, "Resort name is too long."),
    city: z.enum(CITY_VALUES, "Pick a region."),
    abilityLevel: z.enum(ABILITY_VALUES, "Pick a riding style."),
    rideDate: z.iso.date("Pick a date."),
    meetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time."),
    meetPoint: z.string().trim().min(2, "Add a meeting point.").max(120, "Use at most 120 characters."),
    totalSpots: z.number().int().min(1, "At least one spot.").max(50, "At most 50 spots."),
    caption: z
      .string()
      .trim()
      .max(280, "Use at most 280 characters.")
      .transform((value) => (value === "" ? null : value)),
    visibility: z.enum(["friends", "public"]),
    title: z
      .string()
      .trim()
      .max(60, "Use at most 60 characters.")
      .transform((value) => (value === "" ? null : value))
      .optional(),
  })
  .refine((input) => input.visibility === "friends" || (input.title?.length ?? 0) >= 3, {
    message: "Give the event a name (at least 3 characters).",
    path: ["title"],
  });

export type RideInput = z.infer<typeof rideInputSchema>;
/* What a form hands over, before trimming and normalising. */
export type RideFormInput = z.input<typeof rideInputSchema>;

export function validateRideInput(
  input: unknown,
): { success: true; data: RideInput } | { success: false; message: string } {
  const result = rideInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, message: result.error.issues[0]?.message ?? "Check the ride details." };
}
