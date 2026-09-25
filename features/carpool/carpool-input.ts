import { z } from "zod";
import { CITY_VALUES } from "@/features/profile/profile-input";

/* Mirrors the constraints on public.carpools. */
export const carpoolInputSchema = z.object({
  role: z.enum(["driver", "rider"]),
  resort: z.string().trim().min(2, "Pick a resort.").max(60, "Resort name is too long."),
  city: z.enum(CITY_VALUES, "Pick a region."),
  rideDate: z.iso.date("Pick a date."),
  departurePoint: z.string().trim().min(2, "Add a pickup spot.").max(120, "Use at most 120 characters."),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time."),
  seats: z.number().int().min(1, "At least one seat.").max(8, "At most 8 seats."),
  note: z
    .string()
    .trim()
    .max(280, "Use at most 280 characters.")
    .transform((value) => (value === "" ? null : value)),
});

export type CarpoolFormInput = z.input<typeof carpoolInputSchema>;

export function validateCarpoolInput(
  input: unknown,
): { success: true; data: z.infer<typeof carpoolInputSchema> } | { success: false; message: string } {
  const result = carpoolInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, message: result.error.issues[0]?.message ?? "Check the details." };
}
