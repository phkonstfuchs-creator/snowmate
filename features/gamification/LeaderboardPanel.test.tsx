import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Leaderboard from "./LeaderboardPanel";
import type { LeaderboardRow } from "./leaderboard";

const mocks = vi.hoisted(() => ({ leaderboardAction: vi.fn() }));
vi.mock("./actions", () => ({ leaderboardAction: mocks.leaderboardAction }));

const row = (rank: number, extra: Partial<LeaderboardRow> = {}): LeaderboardRow => ({
  rank, userId: `u${rank}`, name: `Rider ${rank}`, handle: null, value: 10_000 - rank * 100, isMe: false, anonymous: false, ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("Leaderboard", () => {
  it("shows the top five and my own place, with the rest one tap away", () => {
    const rows = [...Array.from({ length: 7 }, (_, i) => row(i + 1)), row(8, { isMe: true, name: "Me" })];
    render(<Leaderboard initial={rows} inRegion={false} />);
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(within(list).getByText("(you)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show all 8" }));
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(8);
  });

  it("switches to the region board and shows minors anonymously", async () => {
    mocks.leaderboardAction.mockResolvedValue([row(1, { userId: null, name: null, anonymous: true })]);
    render(<Leaderboard initial={[]} inRegion={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Region" }));
    expect(await screen.findByText("Anonymous rider (under 18)")).toBeInTheDocument();
    expect(mocks.leaderboardAction).toHaveBeenCalledWith("region", "vertical");
    expect(screen.getByText(/not on the regional board/)).toBeInTheDocument();
  });

  it("changes the metric and explains an empty crew board", async () => {
    mocks.leaderboardAction.mockResolvedValue([]);
    render(<Leaderboard initial={[]} inRegion />);
    expect(screen.getByText(/No saved ski days in your crew/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Top speed" }));
    await vi.waitFor(() => expect(mocks.leaderboardAction).toHaveBeenCalledWith("friends", "speed"));
  });
});
