import { beforeEach, describe, expect, it, vi } from "vitest";
import { LIFTS } from "@/lib/lifts";
import { friendLiftMeetupsAction, myLiftMeetupAction, startLiftMeetupAction, stopLiftMeetupAction } from "./actions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn(), dispatchPushSoon: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/push/dispatch", () => ({ dispatchPushSoon: mocks.dispatchPushSoon }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({ rpc: mocks.rpc });
});

describe("lift meetup server boundary", () => {
  it("rejects an unknown lift before a database call", async () => {
    await expect(startLiftMeetupAction("Nordkette", "not-a-lift")).resolves.toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sends only trusted reference IDs, never a client identity, ETA or position", async () => {
    const lift = LIFTS[0]!;
    mocks.rpc.mockResolvedValue({ data: "sharing", error: null });
    await expect(startLiftMeetupAction(lift.resort, lift.id)).resolves.toBe("sharing");
    expect(mocks.rpc).toHaveBeenCalledWith("start_my_lift_meetup", {
      p_resort: lift.resort,
      p_lift_id: lift.id,
    });
    expect(mocks.dispatchPushSoon).toHaveBeenCalledOnce();
  });

  it("passes through the database's age refusal and fails closed on errors", async () => {
    const lift = LIFTS[0]!;
    mocks.rpc.mockResolvedValueOnce({ data: "too_young", error: null });
    await expect(startLiftMeetupAction(lift.resort, lift.id)).resolves.toBe("too_young");
    mocks.rpc.mockResolvedValueOnce({ data: "unknown", error: null });
    await expect(startLiftMeetupAction(lift.resort, lift.id)).resolves.toBe("unavailable");
    expect(mocks.dispatchPushSoon).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST" } });
    await expect(startLiftMeetupAction(lift.resort, lift.id)).resolves.toBe("unavailable");
  });

  it("reads only the RPC-filtered friend rows and stops its own status", async () => {
    const row = {
      user_id: "friend", display_name: "Lena", handle: "lena", resort: "Nordkette", lift_id: "lift",
      started_at: "2026-10-06T10:00:00Z", arrival_at: "2026-10-06T10:10:00Z", expires_at: "2026-10-06T10:30:00Z",
    };
    mocks.rpc.mockResolvedValueOnce({ data: [row], error: null });
    await expect(friendLiftMeetupsAction()).resolves.toEqual([{
      userId: "friend", name: "Lena", handle: "lena", resort: "Nordkette", liftId: "lift",
      startedAt: row.started_at, arrivalAt: row.arrival_at, expiresAt: row.expires_at,
    }]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_friend_lift_meetups");
    mocks.rpc.mockResolvedValueOnce({ data: [row], error: null });
    await expect(myLiftMeetupAction()).resolves.toMatchObject({ userId: "friend" });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(stopLiftMeetupAction()).resolves.toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("stop_my_lift_meetup");
  });
});
