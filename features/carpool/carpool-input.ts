import { z } from "zod";
import { CITY_VALUES } from "@/features/profile/profile-input";

/* Mirrors the constraints on public.carpools. */
export const carpoolInputSchema = z.object({
  role: z.enum(["driver", "rider"]),
  resort: z.string().trim().min(2, "v.pickResort").max(60, "v.resortTooLong"),
  city: z.enum(CITY_VALUES, "v.pickRegion"),
  rideDate: z.iso.date("v.pickDate"),
  departurePoint: z.string().trim().min(2, "v.addPickup").max(120, "v.max|120"),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "v.pickTime"),
  seats: z.number().int().min(1, "v.minSeat").max(8, "v.maxSeats"),
  note: z
    .string()
    .trim()
    .max(280, "v.max|280")
    .transform((value) => (value === "" ? null : value)),
});

export type CarpoolFormInput = z.input<typeof carpoolInputSchema>;

export function validateCarpoolInput(
  input: unknown,
): { success: true; data: z.infer<typeof carpoolInputSchema> } | { success: false; message: string } {
  const result = carpoolInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, message: result.error.issues[0]?.message ?? "v.checkDetails" };
}
