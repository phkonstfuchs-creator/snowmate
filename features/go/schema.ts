import { z } from "zod";
export const withdrawGoInterestInputSchema = z
  .object({ rideId: z.uuid(), idempotencyKey: z.uuid() })
  .strict();
export const setGoInterestInputSchema = withdrawGoInterestInputSchema
  .extend({
    minimumGroup: z.number().int().min(2).max(12),
    needsCarpool: z.boolean(),
  })
  .strict();
