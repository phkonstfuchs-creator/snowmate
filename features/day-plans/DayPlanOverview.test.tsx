import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DayPlanOverview from "./DayPlanOverview";

const plans = [
  {
    id: "plan-next",
    version: 1,
    city: "innsbruck" as const,
    resort: "Axamer Lizum",
    planDate: "2026-10-12",
    meetTime: "09:30",
    transport: "need" as const,
    meetingText: "At the main entrance",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    expiresAt: "2026-10-14T22:00:00.000Z",
  },
  {
    id: "plan-later",
    version: 1,
    city: "innsbruck" as const,
    resort: "Nordkette",
    planDate: "2026-10-20",
    meetTime: "10:00",
    transport: "own" as const,
    meetingText: "Hungerburg station",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    expiresAt: "2026-10-22T22:00:00.000Z",
  },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
});

afterEach(() => vi.useRealTimers());

describe("DayPlanOverview", () => {
  it("puts the next meeting first and keeps all later plans available", () => {
    const onOpen = vi.fn();
    render(<DayPlanOverview result={{ status: "ok", plans }} onOpen={onOpen} onRetry={vi.fn()} />);

    expect(screen.getByText("Axamer Lizum")).toBeInTheDocument();
    expect(screen.getByText("At the main entrance")).toBeInTheDocument();
    expect(screen.getByText(/private/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nordkette/i }));
    expect(onOpen).toHaveBeenCalledWith(plans[1]);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows unavailable as an error state with a retry action", () => {
    const onRetry = vi.fn();
    render(<DayPlanOverview result={{ status: "unavailable" }} onOpen={vi.fn()} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/no plans yet/i)).not.toBeInTheDocument();
  });

  it("shows an empty state only for a successful empty result", () => {
    render(<DayPlanOverview result={{ status: "ok", plans: [] }} onOpen={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText(/no private plans yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps past plans after current plans and never offers to publish one", () => {
    const past = { ...plans[0]!, id: "past-plan", resort: "Stubai Glacier", planDate: "2026-10-08" };
    const onShare = vi.fn();
    render(<DayPlanOverview result={{ status: "ok", plans: [past] }} onOpen={vi.fn()} onRetry={vi.fn()} onShare={onShare} demo />);

    expect(screen.getByText(/demo plans stay on this page until reload/i)).toBeInTheDocument();
    expect(screen.getByText("Past planned days")).toBeInTheDocument();
    expect(screen.getByText("Stubai Glacier")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /prepare a ride/i })).not.toBeInTheDocument();
    expect(onShare).not.toHaveBeenCalled();
  });

  it("puts future meetings before earlier meetings today using Vienna time", () => {
    const earlier = { ...plans[0]!, id: "earlier", resort: "Nordkette", planDate: "2026-10-09", meetTime: "11:30" };
    const futureToday = { ...plans[0]!, id: "future-today", resort: "Kühtai", planDate: "2026-10-09", meetTime: "12:30" };
    const tomorrow = { ...plans[1]!, planDate: "2026-10-10", meetTime: "09:00" };
    const onShare = vi.fn();
    render(<DayPlanOverview result={{ status: "ok", plans: [tomorrow, earlier, futureToday] }} onOpen={vi.fn()} onRetry={vi.fn()} onShare={onShare} />);

    expect(screen.getByRole("button", { name: /Kühtai/ }).firstChild).toHaveTextContent(/Private plan/);
    expect(screen.getByText("More planned days")).toBeInTheDocument();
    expect(screen.getByText("Past planned days")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Prepare a ride", exact: true })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Prepare a ride", exact: true })[0]!);
    expect(onShare).toHaveBeenCalledWith(futureToday);
  });

  it("hides plans already expired and removes one at its exact expiry time", async () => {
    const expired = { ...plans[0]!, id: "expired", resort: "Expired resort", expiresAt: "2026-10-09T09:59:59.000Z" };
    const expiring = { ...plans[1]!, id: "expiring", resort: "Expiring resort", planDate: "2026-10-10", meetTime: "09:00", expiresAt: "2026-10-09T10:00:10.000Z" };
    const future = { ...plans[1]!, id: "future", resort: "Future resort", planDate: "2026-10-11", meetTime: "09:00", expiresAt: "2026-10-12T10:00:00.000Z" };
    render(<DayPlanOverview result={{ status: "ok", plans: [expired, expiring, future] }} onOpen={vi.fn()} onRetry={vi.fn()} />);

    expect(screen.queryByText("Expired resort")).not.toBeInTheDocument();
    expect(screen.getByText("Expiring resort")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.queryByText("Expiring resort")).not.toBeInTheDocument();
    expect(screen.getByText("Future resort")).toBeInTheDocument();
  });

  it("rechecks plan expiry on visibility change after a delayed background timer", async () => {
    const expiring = { ...plans[0]!, resort: "Expiring on focus", planDate: "2026-10-10", meetTime: "09:00", expiresAt: "2026-10-09T10:00:10.000Z" };
    render(<DayPlanOverview result={{ status: "ok", plans: [expiring] }} onOpen={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText("Expiring on focus")).toBeInTheDocument();

    vi.setSystemTime(new Date("2026-10-09T10:00:10.000Z"));
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.queryByText("Expiring on focus")).not.toBeInTheDocument();
  });
});
