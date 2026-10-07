import { describe, expect, it, vi } from "vitest";
import { createDispatchHandler } from "./dispatch-handler";

const identity = { userId: "a11f7000-0000-4000-8000-000000000001", sessionId: "b11f7000-0000-4000-8000-000000000002" };

describe("push dispatch authorization", () => {
  it("never accesses the service-role queue for anonymous, invalid, or oversized credentials", async () => {
    const authenticate = vi.fn().mockResolvedValue(null);
    const dispatch = vi.fn();
    const handler = createDispatchHandler({ authenticate, dispatch });
    for (const token of [null, "Bearer invalid", `Bearer ${"x".repeat(8193)}`]) {
      const headers = token ? { authorization: token } : undefined;
      expect((await handler(new Request("https://app.test/push", { method: "POST", headers }))).status).toBe(401);
    }
    expect(dispatch).not.toHaveBeenCalled();
  });
  it("returns no global queue counts after authenticated dispatch", async () => {
    const authenticate = vi.fn().mockResolvedValue(identity);
    const dispatch = vi.fn().mockResolvedValue(undefined);
    const response = await createDispatchHandler({ authenticate, dispatch })(new Request("https://app.test/push", {
      method: "POST", headers: { authorization: "Bearer test.jwt.token" },
    }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(identity);
  });

  it("does not expose the queue or CORS preflight to browsers", async () => {
    const authenticate = vi.fn().mockResolvedValue(identity);
    const dispatch = vi.fn();
    const response = await createDispatchHandler({ authenticate, dispatch })(new Request("https://app.test/push", {
      method: "OPTIONS", headers: { origin: "https://evil.example" },
    }));
    expect(response.status).toBe(405);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(authenticate).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns only a generic error when authorization or sending fails", async () => {
    const request = new Request("https://app.test/push", {
      method: "POST", headers: { authorization: "Bearer test.jwt.token" },
    });
    const denied = await createDispatchHandler({
      authenticate: vi.fn().mockRejectedValue(new Error("private auth detail")), dispatch: vi.fn(),
    })(request);
    expect(denied.status).toBe(503);
    expect(await denied.text()).toBe("");

    const failed = await createDispatchHandler({
      authenticate: vi.fn().mockResolvedValue(identity), dispatch: vi.fn().mockRejectedValue(new Error("queue detail")),
    })(request);
    expect(failed.status).toBe(503);
    expect(await failed.text()).toBe("");
  });
});
