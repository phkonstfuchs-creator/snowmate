"use server";
import { isUuid, rpcOutcome } from "@/lib/server-action";
import { getT } from "@/lib/i18n/server";
import { revalidateApp } from "@/lib/revalidate";
import { getGoStatus } from "./queries";
export type GoActionResult = { ok: boolean; message: string };
async function unavailable(): Promise<GoActionResult> {
  const t = await getT();
  return { ok: false, message: t("common.unavailable") };
}
export async function saveGoInterest(
  rideId: string,
  minimumGroup: number,
  needsCarpool: boolean,
): Promise<GoActionResult> {
  if (
    !isUuid(rideId) ||
    !Number.isInteger(minimumGroup) ||
    minimumGroup < 2 ||
    minimumGroup > 12 ||
    typeof needsCarpool !== "boolean"
  )
    return unavailable();
  const answer = await rpcOutcome(
    "set_ride_go_interest",
    {
      target_ride: rideId,
      minimum_group: minimumGroup,
      needs_carpool: needsCarpool,
    },
    [
      "saved",
      "not_found",
      "invalid",
      "already_joined",
      "already_requested",
      "profile_incomplete",
    ] as const,
    () => revalidateApp(),
  );
  const t = await getT();
  return {
    ok: answer === "saved",
    message:
      answer === "saved"
        ? t("go.saved")
        : answer === "profile_incomplete"
          ? t("common.profileIncomplete")
          : t("common.unavailable"),
  };
}
export async function withdrawGoInterest(
  rideId: string,
): Promise<GoActionResult> {
  if (!isUuid(rideId)) return unavailable();
  const answer = await rpcOutcome(
    "withdraw_ride_go_interest",
    { target_ride: rideId },
    ["withdrawn", "not_found"] as const,
    () => revalidateApp(),
  );
  const t = await getT();
  return {
    ok: answer === "withdrawn",
    message:
      answer === "withdrawn" ? t("go.withdrawn") : t("common.unavailable"),
  };
}
export async function readGoStatus(rideId: string) {
  return getGoStatus(rideId);
}
