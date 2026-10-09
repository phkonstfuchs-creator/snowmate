import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrivacyBootstrap from "./PrivacyBootstrap";
import type { ConsentBoundAnalytics } from "./posthog";

function analyticsDouble(syncResult: boolean): ConsentBoundAnalytics {
  return {
    capture: vi.fn(() => true),
    optIn: vi.fn<(analyticsId: string) => boolean>(() => true),
    sync: vi.fn(() => syncResult),
    withdraw: vi.fn(),
  };
}

describe("PrivacyBootstrap", () => {
  it("registers the PWA worker and resumes previously consented analytics", async () => {
    const analytics = analyticsDouble(true);
    const registerServiceWorker = vi.fn(async () => "registered" as const);

    render(
      <PrivacyBootstrap
        analytics={analytics}
        registerServiceWorker={registerServiceWorker}
      />,
    );

    await waitFor(() => {
      expect(registerServiceWorker).toHaveBeenCalledOnce();
      expect(analytics.sync).toHaveBeenCalledOnce();
      expect(analytics.capture).toHaveBeenCalledWith(
        "pwa_service_worker_registered",
        { result: "registered" },
      );
    });
  });

  it("does not emit analytics when consent is absent", async () => {
    const analytics = analyticsDouble(false);
    const registerServiceWorker = vi.fn(async () => "registered" as const);

    render(
      <PrivacyBootstrap
        analytics={analytics}
        registerServiceWorker={registerServiceWorker}
      />,
    );

    await waitFor(() => expect(registerServiceWorker).toHaveBeenCalledOnce());
    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
