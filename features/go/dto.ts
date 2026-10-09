import { z } from "zod";
const schema = z
  .object({
    id: z.uuid(),
    rideId: z.uuid(),
    minimumGroup: z.number().int().min(2).max(12),
    needsCarpool: z.boolean(),
    confirmedGroup: z.number().int().min(0).max(12),
    hasConfirmedCarpool: z.boolean(),
    groupReady: z.boolean(),
    carpoolReady: z.boolean(),
    ready: z.boolean(),
    status: z.enum([
      "interested",
      "ready",
      "requested",
      "confirmed",
      "expired",
      "withdrawn",
    ]),
  })
  .strict();
export type GoStatus = Readonly<z.infer<typeof schema>>;
export function parseGoStatus(input: unknown): GoStatus | null {
  const result = schema.safeParse(input);
  return result.success ? result.data : null;
}
