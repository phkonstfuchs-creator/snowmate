import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LIFTS } from "@/lib/lifts";
import LiftMeetupPanel from "./LiftMeetupPanel";
import type { LiftMeetup } from "./meetup";

const lift = LIFTS[0]!;
const friend: LiftMeetup = {
  userId: "friend-1", name: "Lena", handle: "lena", resort: lift.resort, liftId: lift.id,
  startedAt: "2026-10-06T10:00:00Z", arrivalAt: "2026-10-06T10:14:00Z", expiresAt: "2099-10-06T10:30:00Z",
};
const mine: LiftMeetup = { ...friend, userId: "me", name: "Me" };

const defaults = {
  mine: null, friends: [friend], me: null, busy: false, result: null,
  onStop: vi.fn(), onLocate: vi.fn(),
};

describe("LiftMeetupPanel", () => {
  it("shows a friend's estimated top arrival and explains uncertainty", () => {
    render(<LiftMeetupPanel {...defaults} />);
    expect(screen.getByText(/Lena is estimated/)).toBeInTheDocument();
    expect(screen.getByText(/Estimate based on lift time/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show your own location/ })).toBeInTheDocument();
  });

  it("uses only the passed device position for an approximate route hint", () => {
    render(<LiftMeetupPanel {...defaults} me={{ lat: lift.bottomCoordinates[0], lng: lift.bottomCoordinates[1], accuracy: 10 }} />);
    expect(screen.getByText(/For you: take/)).toBeInTheDocument();
    expect(screen.getByText(/Check the piste map/)).toBeInTheDocument();
  });

  it("withholds a lift suggestion when the device position is imprecise", () => {
    render(<LiftMeetupPanel {...defaults} me={{ lat: lift.bottomCoordinates[0], lng: lift.bottomCoordinates[1], accuracy: 500 }} />);
    expect(screen.queryByText(/For you: take/)).not.toBeInTheDocument();
    expect(screen.getByText(/too imprecise/)).toBeInTheDocument();
  });

  it("can end its own status and reports a failed start", () => {
    const onStop = vi.fn();
    render(<LiftMeetupPanel {...defaults} mine={mine} friends={[]} result="too_young" onStop={onStop} />);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("from 16");
    expect(screen.getByText(/No friends are heading/)).toBeInTheDocument();
  });
});
