import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import GoStartSheet from "./GoStartSheet";
import { toLiveRide, type RideRow } from "@/features/rides/live-ride";
const callbacks = () => ({ onSelect: vi.fn(), onCreate: vi.fn(), onRetry: vi.fn(), onClose: vi.fn() });
const row: RideRow = { id: "r", host_id: "h", host_display_name: "Lena", host_handle: "lena", host_is_minor: false, resort: "Nordkette", city: "innsbruck", ability_level: "park", ride_date: "2026-10-10", meet_time: "11:00:00", meet_point: null, meet_point_locked: true, total_spots: 3, taken_spots: 0, caption: null, title: null, visibility: "friends", created_at: "2026-10-09T08:00:00Z", is_host: false, is_joined: false, participants: [] };
it("opens only a selected visible ride after the chooser has finished dismissing", async () => {
  const cb = callbacks();
  render(<GoStartSheet rides={[toLiveRide(row, new Date(row.created_at))]} unavailable={false} demo={false} basePath="" {...cb} />);
  fireEvent.click(screen.getByRole("button", { name: /Nordkette/ }));
  expect(cb.onSelect).not.toHaveBeenCalled();
  await waitFor(() => expect(cb.onSelect).toHaveBeenCalledWith("r"));
  expect(cb.onClose).toHaveBeenCalledOnce();
});
it("offers a clear empty start and opens the create sheet only after close", async () => {
  const cb = callbacks();
  render(<GoStartSheet rides={[]} unavailable={false} demo={false} basePath="" {...cb} />);
  expect(screen.getByText(/No suitable upcoming ride yet/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Post a ride" }));
  expect(cb.onCreate).not.toHaveBeenCalled();
  await waitFor(() => expect(cb.onCreate).toHaveBeenCalledOnce());
});
it("retries an outage without exposing candidates or suggesting no rides exist", () => {
  const cb = callbacks();
  render(<GoStartSheet rides={[toLiveRide(row, new Date(row.created_at))]} unavailable demo={false} basePath="" {...cb} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Pistl Go is unavailable");
  expect(screen.queryByText("Nordkette")).not.toBeInTheDocument();
  expect(screen.queryByText(/No suitable future ride/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Check conditions again" }));
  expect(cb.onRetry).toHaveBeenCalledOnce();
});
it("keeps demo entry links in the prototype and makes no network choices", async () => {
  const cb = callbacks();
  render(<GoStartSheet rides={[toLiveRide(row, new Date(row.created_at))]} unavailable={false} demo basePath="/demo" {...cb} />);
  const sheet = screen.getByRole("dialog");
  expect(within(sheet).getByRole("note")).toHaveTextContent("No wish is saved here");
  expect(within(sheet).queryByText("Nordkette")).not.toBeInTheDocument();
  expect(within(sheet).getByRole("link", { name: "Find your crew" })).toHaveAttribute("href", "/demo/people");
  expect(within(sheet).getByRole("link", { name: "Browse open events" })).toHaveAttribute("href", "/demo/events");
  fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(cb.onClose).toHaveBeenCalledOnce());
  expect(cb.onSelect).not.toHaveBeenCalled();
  expect(cb.onCreate).not.toHaveBeenCalled();
});
