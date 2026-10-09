import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import GoOverview from "./GoOverview";
const id = "00000000-0000-4000-8000-000000000001";
const row = {
  ride: {
    id,
    resort: "Stubai",
    rideDate: "2027-01-08",
    meetTime: "09:00:00",
    totalSpots: 3,
  },
  go: {
    id,
    rideId: id,
    minimumGroup: 3,
    needsCarpool: true,
    confirmedGroup: 1,
    hasConfirmedCarpool: false,
    groupReady: false,
    carpoolReady: false,
    ready: false,
    status: "interested" as const,
  },
};
it("hides empty and makes unavailable honest and retryable", () => {
  const retry = vi.fn();
  const view = render(
    <GoOverview
      result={{ status: "ok", interests: [] }}
      onOpen={() => {}}
      onRetry={retry}
    />,
  );
  expect(screen.queryByRole("heading")).toBeNull();
  view.rerender(
    <GoOverview
      result={{ status: "unavailable" }}
      onOpen={() => {}}
      onRetry={retry}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("unavailable");
  fireEvent.click(screen.getByRole("button"));
  expect(retry).toHaveBeenCalledOnce();
});
it("opens an existing detail, never joins or loses warnings", () => {
  const open = vi.fn();
  render(
    <GoOverview
      result={{
        status: "ok",
        interests: [{ ...row, go: { ...row.go, status: "confirmed" } }],
      }}
      onOpen={open}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "participation remains confirmed",
  );
  expect(screen.getByText("Confirmed carpool seat missing.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Open plan: Stubai" }));
  expect(open).toHaveBeenCalledWith(id);
});
it.each(["interested", "ready", "requested", "confirmed"] as const)(
  "shows real %s state",
  (status) => {
    render(
      <GoOverview
        result={{
          status: "ok",
          interests: [
            {
              ...row,
              go: {
                ...row.go,
                status,
                ready: status !== "interested",
                hasConfirmedCarpool: true,
              },
            },
          ],
        }}
        onOpen={() => {}}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("Confirmed carpool seat available.")).toBeVisible();
    expect(screen.getByRole("status")).toBeVisible();
  },
);
