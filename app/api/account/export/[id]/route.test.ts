import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

const rpc = vi.fn();

describe("GET /api/account/export/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ rpc });
  });

  it("returns an authenticated JSON attachment with private caching disabled", async () => {
    rpc.mockResolvedValue({
      data: {
        export_version: "snowmate-json-v1",
        generated_at: "2026-08-03T10:00:00+00:00",
        account: { email: "owner@example.com" },
      },
      error: null,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "10000000-0000-4000-8000-000000000001",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain(
      "pistl-data-export.json",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ export_version: "snowmate-json-v1" }),
    );
    expect(rpc).toHaveBeenCalledWith("download_account_export", {
      p_export_id: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("rejects malformed identifiers before opening a Supabase client", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("does not reveal whether another export exists", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({
        id: "10000000-0000-4000-8000-000000000002",
      }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
