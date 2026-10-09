import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/no plans yet/i)).not.toBeInTheDocument();
  });

  it("shows an empty state only for a successful empty result", () => {
    render(<DayPlanOverview result={{ status: "ok", plans: [] }} onOpen={vi.fn()} onRetry={vi.fn()} />);
    expect(screen.getByText(/no private plans yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
