import type { MessageKey } from "@/lib/i18n/translate";

export interface LiftMeetup {
  userId: string;
  name: string;
  handle: string | null;
  resort: string;
  liftId: string;
  startedAt: string;
  arrivalAt: string;
  expiresAt: string;
}

export interface LiftMeetupRow {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  resort: string;
  lift_id: string;
  started_at: string;
  arrival_at: string;
  expires_at: string;
}

export function toLiftMeetup(row: LiftMeetupRow): LiftMeetup {
  return {
    userId: row.user_id,
    name: row.display_name ?? row.handle ?? "?",
    handle: row.handle,
    resort: row.resort,
    liftId: row.lift_id,
    startedAt: row.started_at,
    arrivalAt: row.arrival_at,
    expiresAt: row.expires_at,
  };
}

export type StartResult = "sharing" | "invalid" | "profile_incomplete" | "too_young" | "unauthenticated" | "unavailable";

export const START_MESSAGES: Record<Exclude<StartResult, "sharing">, MessageKey> = {
  invalid: "meetup.invalid",
  profile_incomplete: "common.profileIncomplete",
  too_young: "meetup.from16",
  unauthenticated: "profile.sessionEnded",
  unavailable: "common.unavailable",
};
