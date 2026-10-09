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

const summarySchema = z
  .object({
    ride: z
      .object({
        id: z.uuid(),
        resort: z
          .object({
            id: z.string().regex(/^[a-z0-9-]{2,64}$/),
            name: z.string().min(1).max(200),
          })
          .strict(),
        startsAt: z.iso.datetime({ offset: true }),
        capacity: z.number().int().min(2).max(12),
      })
      .strict(),
    go: schema,
  })
  .strict()
  .refine(
    ({ ride, go }) =>
      ride.id === go.rideId &&
      go.minimumGroup <= ride.capacity &&
      go.confirmedGroup <= ride.capacity &&
      go.status !== "withdrawn" &&
      go.status !== "expired",
  );
const overviewSchema = z
  .array(summarySchema)
  .max(50)
  .refine(
    (items) => new Set(items.map((item) => item.ride.id)).size === items.length,
  );
export type GoInterestSummary = Readonly<z.infer<typeof summarySchema>>;
export function parseOwnGoInterests(
  input: unknown,
): readonly GoInterestSummary[] | null {
  const result = overviewSchema.safeParse(input);
  return result.success ? result.data : null;
}
