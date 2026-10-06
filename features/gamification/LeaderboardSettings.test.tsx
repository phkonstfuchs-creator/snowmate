import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LeaderboardSettings from "./LeaderboardSettings";

const mocks = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("./actions", () => ({ setLeaderboardSettingAction: mocks.set }));

describe("LeaderboardSettings", () => {
  it("defaults to friends on, region off, and switches the region on", async () => {
    mocks.set.mockResolvedValue(true);
    render(<LeaderboardSettings initial={{ friends: true, region: false }} isMinor />);
    expect(screen.getByRole("switch", { name: /Friends see my season/ })).toHaveAttribute("aria-checked", "true");
    const region = screen.getByRole("switch", { name: /regional leaderboard/ });
    expect(region).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/appear anonymously/)).toBeInTheDocument();
    fireEvent.click(region);
    await vi.waitFor(() => expect(region).toHaveAttribute("aria-checked", "true"));
    expect(mocks.set).toHaveBeenCalledWith("region", true);
  });

  it("is hidden until the settings are available", () => {
    const { container } = render(<LeaderboardSettings initial={null} isMinor={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
