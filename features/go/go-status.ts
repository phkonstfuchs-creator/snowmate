import { z } from "zod";
const statusSchema = z.strictObject({
  id: z.uuid(),
  rideId: z.uuid(),
  minimumGroup: z.number().int().min(2).max(12),
  needsCarpool: z.boolean(),
  confirmedGroup: z.number().int().min(1).max(51),
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
});
export type GoStatus = z.infer<typeof statusSchema>;
const summarySchema = z.strictObject({
  ride: z.strictObject({
    id: z.uuid(),
    resort: z.string().min(1).max(120),
    rideDate: z.iso.date(),
    meetTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/u),
    totalSpots: z.number().int().min(1).max(50),
  }),
  go: statusSchema,
});
export type GoSummary = z.infer<typeof summarySchema>;
export type GoOverviewResult =
  { status: "ok"; interests: GoSummary[] } | { status: "unavailable" };
export type GoStatusResult =
  { status: "ok"; wish: GoStatus | null } | { status: "unavailable" };
export function parseGoStatus(
  data: unknown,
  rideId: string,
): GoStatus | null | undefined {
  if (data === null) return null;
  const parsed = statusSchema.safeParse(data);
  return parsed.success && parsed.data.rideId === rideId
    ? parsed.data
    : undefined;
}
export function parseGoOverview(data: unknown): GoSummary[] | undefined {
  const parsed = z.array(summarySchema).max(50).safeParse(data);
  if (!parsed.success) return undefined;
  const rows = parsed.data;
  if (
    rows.some(
      (row) =>
        row.ride.id !== row.go.rideId ||
        row.go.confirmedGroup > row.ride.totalSpots + 1 ||
        ["expired", "withdrawn"].includes(row.go.status),
    ) ||
    new Set(rows.map((row) => row.ride.id)).size !== rows.length
  )
    return undefined;
  return rows;
}
