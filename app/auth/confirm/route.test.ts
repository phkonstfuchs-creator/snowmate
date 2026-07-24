import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

const verifyOtp = vi.fn();

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { verifyOtp },
    });
  });

  it("rejects token types outside the signup flow", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=abc&type=recovery",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?confirmation=failed",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("redirects a verified signup to the protected app", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=abc&type=email",
      ),
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "abc",
      type: "email",
    });
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/feed",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("keeps invalid or expired signup links outside the app", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=expired&type=email",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?confirmation=failed",
    );
  });
});
