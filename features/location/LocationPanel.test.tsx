import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LocationPanel from "./LocationPanel";

const friend = { userId: "f1", name: "Max Huber", handle: "max_h", lat: 47.1, lng: 11.2, accuracy: 10, updatedAt: new Date().toISOString() };

describe("LocationPanel", () => {
  it("explains sharing before it starts and passes the chosen duration", async () => {
    const onShare = vi.fn().mockResolvedValue(true);
    render(
      <LocationPanel sharingEnd={null} busy={false} error={null} friends={[]} onShare={onShare} onStop={vi.fn()} onFocusFriend={vi.fn()} />,
    );

    expect(screen.getByText("None of your friends is sharing their location right now.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("dialog", { name: "Share your location" })).toBeInTheDocument();
    expect(screen.getByText(/Only confirmed friends see it/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("4 hours"));
    fireEvent.click(screen.getByRole("button", { name: "Start sharing" }));

    await waitFor(() => expect(onShare).toHaveBeenCalledWith(240));
  });

  it("shows the end time, a stop button and friends on the map", () => {
    const onStop = vi.fn();
    const onFocusFriend = vi.fn();
    render(
      <LocationPanel
        sharingEnd={new Date(Date.now() + 3_600_000).toISOString()}
        busy={false}
        error="Location access is blocked."
        friends={[friend]}
        onShare={vi.fn()}
        onStop={onStop}
        onFocusFriend={onFocusFriend}
      />,
    );

    expect(screen.getByText(/Sharing until/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Location access is blocked.");
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Max Huber/ }));
    expect(onFocusFriend).toHaveBeenCalledWith(friend);
    expect(screen.getByText("Friends on the map (1)")).toBeInTheDocument();
  });

  it("says when friends' positions could not be loaded", () => {
    render(
      <LocationPanel sharingEnd={null} busy={false} error={null} friends={null} onShare={vi.fn()} onStop={vi.fn()} onFocusFriend={vi.fn()} />,
    );
    expect(screen.getByText("Friends' positions could not be loaded.")).toBeInTheDocument();
  });
});
