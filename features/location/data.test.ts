import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLiveLocations, getResortPresence } from "./data";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();
const presenceRow = {
  user_id: "10000000-0000-4000-8000-000000000001",
  display_name: "Alex Berg",
  handle: "alex_berg",
  avatar_path: null,
  resort_id: "stubai-glacier",
  resort_name: "Stubaier Gletscher",
  city: "innsbruck",
  last_seen_at: "2026-08-03T10:00:00+00:00",
  relationship: "friend",
};

describe("location data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("loads broad resort presence without requesting private tables", async () => {
    rpc.mockResolvedValue({ data: [presenceRow], error: null });

    await expect(getResortPresence("stubai-glacier")).resolves.toEqual({
      status: "ready",
      data: [expect.objectContaining({ userId: presenceRow.user_id })],
    });
    expect(rpc).toHaveBeenCalledWith("get_resort_presence", {
      p_limit: 100,
      p_resort_id: "stubai-glacier",
    });
  });

  it("fails closed if exact coordinates leak into broad presence", async () => {
    rpc.mockResolvedValue({
      data: [{ ...presenceRow, latitude: 47.01 }],
      error: null,
    });

    await expect(getResortPresence()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("rejects invalid resort filters before opening a client", async () => {
    await expect(getLiveLocations("../../private")).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
