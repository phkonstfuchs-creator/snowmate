import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PrivacySettings from "./PrivacySettings";
import type { ConsentBoundAnalytics } from "@/features/privacy/posthog";

const mocks = vi.hoisted(() => ({
  setAnalyticsConsentAction: vi.fn(),
}));

vi.mock("@/features/privacy/actions", () => ({
  setAnalyticsConsentAction: mocks.setAnalyticsConsentAction,
}));

const ANALYTICS_ID = "9fc1a0dc-b151-4df2-86cb-f3015badf019";

function analyticsDouble(): ConsentBoundAnalytics {
  return {
    capture: vi.fn(() => false),
    optIn: vi.fn<(analyticsId: string) => boolean>(() => true),
    sync: vi.fn(() => false),
    withdraw: vi.fn(),
  };
}

describe("PrivacySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.setAnalyticsConsentAction.mockImplementation(
      async ({ enabled }: { enabled: boolean }) => ({
        ok: true as const,
        analyticsId: enabled ? ANALYTICS_ID : null,
      }),
    );
  });

  it("keeps necessary processing permanently enabled", async () => {
    render(<PrivacySettings analytics={analyticsDouble()} />);

    const necessary = screen.getByRole("checkbox", {
      name: "Notwendige Funktionen",
    });
    expect(necessary).toBeChecked();
    expect(necessary).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByRole("switch", { name: "Anonyme Nutzungsanalyse" }),
      ).toHaveAttribute("aria-checked", "false");
    });
  });

  it("requires an explicit save before opting in and supports withdrawal", async () => {
    const analytics = analyticsDouble();
    render(<PrivacySettings analytics={analytics} />);

    const toggle = screen.getByRole("switch", {
      name: "Anonyme Nutzungsanalyse",
    });
    fireEvent.click(toggle);

    expect(analytics.optIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Auswahl speichern" }));

    await waitFor(() => {
      expect(mocks.setAnalyticsConsentAction).toHaveBeenCalledWith({
        enabled: true,
        idempotencyKey: expect.any(String),
      });
      expect(analytics.optIn).toHaveBeenCalledWith(ANALYTICS_ID);
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Datenschutzauswahl gespeichert.",
    );

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Auswahl speichern" }));

    await waitFor(() => {
      expect(mocks.setAnalyticsConsentAction).toHaveBeenLastCalledWith({
        enabled: false,
        idempotencyKey: expect.any(String),
      });
      expect(analytics.withdraw).toHaveBeenCalledOnce();
    });
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("does not present analytics as necessary for using Pistl", () => {
    render(<PrivacySettings analytics={analyticsDouble()} />);

    expect(
      screen.getByText(/Pistl funktioniert auch ohne Nutzungsanalyse/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zurück zum Profil" }),
    ).toHaveAttribute("href", "/profile");
  });
});
