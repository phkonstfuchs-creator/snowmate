import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscoverScreen from "./DiscoverScreen";
import type { DeckCard } from "./discovery";

const mocks = vi.hoisted(() => ({ swipe: vi.fn(), deck: vi.fn(), setDiscoverable: vi.fn(), openChat: vi.fn() }));
vi.mock("./actions", () => ({ swipeAction: mocks.swipe, deckAction: mocks.deck, setDiscoverableAction: mocks.setDiscoverable }));
vi.mock("@/features/chat/actions", () => ({ openDirectChatAction: mocks.openChat }));
vi.mock("@/features/safety/actions", () => ({ reportUserAction: vi.fn(), blockUserAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const card = (n: number): DeckCard => ({
  userId: `c4a70000-0000-4000-8000-00000000000${n}`,
  name: `Rider ${n}`,
  abilityLevel: "park",
  ridingStyles: ["park", "chill"],
  bio: "Park laps all day",
  mutualFriends: n === 1 ? 2 : 0,
});

beforeEach(() => vi.clearAllMocks());

describe("DiscoverScreen", () => {
  it("asks for a birth date first", () => {
    render(<DiscoverScreen initialDeck={[]} discoverable={false} hasBirthDate={false} isMinor />);
    expect(screen.getByText(/add your date of birth/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("is off until switched on and explains the rules for minors", async () => {
    mocks.setDiscoverable.mockResolvedValue(true);
    mocks.deck.mockResolvedValue([card(1)]);
    render(<DiscoverScreen initialDeck={[]} discoverable={false} hasBirthDate isMinor />);
    expect(screen.getByText(/only meet friends of your friends/)).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Take part in swiping" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(await screen.findByRole("heading", { name: "Rider 1" })).toBeInTheDocument();
    expect(mocks.setDiscoverable).toHaveBeenCalledWith(true);
    expect(screen.getByText("2 friends in common")).toBeInTheDocument();
  });

  it("likes, passes and celebrates a match", async () => {
    mocks.swipe.mockResolvedValueOnce("passed").mockResolvedValueOnce("matched");
    render(<DiscoverScreen initialDeck={[card(1), card(2)]} discoverable hasBirthDate isMinor={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip Rider 1" }));
    expect(mocks.swipe).toHaveBeenCalledWith(card(1).userId, false);
    fireEvent.click(await screen.findByRole("button", { name: "Ride with Rider 2" }));
    expect(await screen.findByRole("dialog", { name: "It's a match!" })).toHaveTextContent("You and Rider 2 are now friends");
    expect(mocks.swipe).toHaveBeenLastCalledWith(card(2).userId, true);
    expect(screen.getByText("Nobody new right now.")).toBeInTheDocument();
  });

  it("swipes by dragging past the threshold", () => {
    mocks.swipe.mockResolvedValue("liked");
    render(<DiscoverScreen initialDeck={[card(1)]} discoverable hasBirthDate isMinor={false} />);
    const surface = screen.getByText("Park laps all day").parentElement!;
    surface.setPointerCapture = vi.fn();
    fireEvent.pointerDown(surface, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 260, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 260, pointerId: 1 });
    expect(mocks.swipe).toHaveBeenCalledWith(card(1).userId, true);
  });
});

describe("DiscoverScreen in the demo", () => {
  it("works on fixtures without touching the server, and shows report and block", async () => {
    render(<DiscoverScreen initialDeck={[card(1), card(2)]} discoverable={false} hasBirthDate isMinor={false} demo />);
    fireEvent.click(screen.getByRole("switch", { name: "Take part in swiping" }));
    expect(await screen.findByRole("heading", { name: "Rider 1" })).toBeInTheDocument();
    expect(mocks.setDiscoverable).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Report or block/ }));
    expect(screen.getByRole("dialog", { name: "Report or block" })).toBeInTheDocument();
  });

  it("matches on a like with friends in common and opens the demo crew to write", async () => {
    render(<DiscoverScreen initialDeck={[card(1)]} discoverable hasBirthDate isMinor={false} demo />);
    fireEvent.click(screen.getByRole("button", { name: "Ride with Rider 1" }));
    expect(await screen.findByRole("dialog", { name: "It's a match!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Write a message" })).toHaveAttribute("href", "/demo/crew");
    expect(mocks.swipe).not.toHaveBeenCalled();
    expect(mocks.openChat).not.toHaveBeenCalled();
  });
});

describe("DiscoverScreen empty deck", () => {
  it("offers an invite to a minor, whose deck grows only with friends", () => {
    render(<DiscoverScreen initialDeck={[]} discoverable hasBirthDate isMinor />);
    expect(screen.getByRole("link", { name: "Invite a friend" })).toHaveAttribute("href", "/crew");
  });
});
