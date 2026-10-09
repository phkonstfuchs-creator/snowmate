import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRideResortCatalog } from "./RideCatalog";
const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ order: mocks.order });
});
describe("real resort catalog", () => {
  it("uses the selected city and validated database records", async () => {
    mocks.order.mockResolvedValue({
      data: [{ id: "axamer-lizum", name: "Axamer Lizum" }],
      error: null,
    });
    expect(await getRideResortCatalog("innsbruck")).toEqual({
      status: "ready",
      data: [{ id: "axamer-lizum", name: "Axamer Lizum" }],
    });
    expect(mocks.eq).toHaveBeenCalledWith("city", "innsbruck");
  });
  it("fails closed for missing database catalog", async () => {
    mocks.order.mockResolvedValue({ data: null, error: { code: "missing" } });
    expect(await getRideResortCatalog("salzburg")).toEqual({
      status: "unavailable",
    });
  });
  it("fails closed for invalid records", async () => {
    mocks.order.mockResolvedValue({
      data: [{ id: "../bad", name: "Bad" }],
      error: null,
    });
    expect(await getRideResortCatalog("innsbruck")).toEqual({
      status: "unavailable",
    });
  });
  it("fails closed for connection exceptions", async () => {
    mocks.client.mockRejectedValue(new Error("offline"));
    expect(await getRideResortCatalog("innsbruck")).toEqual({
      status: "unavailable",
    });
  });
});
