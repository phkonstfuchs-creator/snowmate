import { describe, expect, it, vi } from "vitest";
import { registerPistlServiceWorker } from "./service-worker-registration";

describe("service worker registration", () => {
  it("registers the Pistl worker with an uncached root scope", async () => {
    const register = vi.fn(async () => ({ active: {} }));

    await expect(
      registerPistlServiceWorker({
        isSecureContext: true,
        serviceWorker: { register },
      }),
    ).resolves.toBe("registered");
    expect(register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("does nothing in unsupported or insecure contexts", async () => {
    const register = vi.fn();

    await expect(
      registerPistlServiceWorker({
        isSecureContext: false,
        serviceWorker: { register },
      }),
    ).resolves.toBe("insecure");
    await expect(
      registerPistlServiceWorker({
        isSecureContext: true,
        serviceWorker: null,
      }),
    ).resolves.toBe("unsupported");
    expect(register).not.toHaveBeenCalled();
  });

  it("contains registration failures instead of breaking settings", async () => {
    const register = vi.fn(async () => {
      throw new Error("registration failed");
    });

    await expect(
      registerPistlServiceWorker({
        isSecureContext: true,
        serviceWorker: { register },
      }),
    ).resolves.toBe("failed");
  });
});
