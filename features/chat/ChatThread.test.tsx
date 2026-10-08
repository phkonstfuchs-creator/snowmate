import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatThread from "./ChatThread";
import type { ChatMessage } from "./message";

const mocks = vi.hoisted(() => ({ poll: vi.fn(), send: vi.fn(), sendLocation: vi.fn() }));
vi.mock("./actions", () => ({ pollMessagesAction: mocks.poll, sendMessageAction: mocks.send, sendLocationAction: mocks.sendLocation }));
vi.mock("@/features/safety/ReportBlockSheet", () => ({
  default: ({ target }: { target: { name: string } }) => <div role="dialog">Report {target.name}</div>,
}));

const CONV = "c4a70000-0000-4000-8000-0000000000aa";
const first: ChatMessage = { id: "m1", senderId: "u2", senderName: "Lena", body: "Morgen Nordkette?", createdAt: "2026-10-05T10:00:00Z", isMine: false, kind: "text", position: null };
const mine: ChatMessage = { id: "m2", senderId: "me", senderName: "Me", body: "Bin dabei", createdAt: "2026-10-05T10:01:00Z", isMine: true, kind: "text", position: null };

describe("ChatThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.poll.mockResolvedValue([]);
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.useRealTimers());

  it("shows the messages, names the other person once, and marks the chat read", async () => {
    render(<ChatThread conversationId={CONV} title="Lena Moser" subtitle="@lena" initialMessages={[first, mine]} other={{ id: "u2", name: "Lena Moser" }} />);

    expect(screen.getByRole("heading", { name: "Lena Moser" })).toBeInTheDocument();
    expect(screen.getByText("Morgen Nordkette?")).toBeInTheDocument();
    expect(screen.getByText("Lena")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Crew" })).toHaveAttribute("href", "/crew");
    await waitFor(() => expect(mocks.poll).toHaveBeenCalledWith(CONV, null));
  });

  it("sends a message and fetches it right away", async () => {
    mocks.send.mockResolvedValue("sent");
    mocks.poll.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...mine, id: "m3", body: "Servus", createdAt: "2026-10-05T10:02:00Z" }]);
    render(<ChatThread conversationId={CONV} title="Lena" initialMessages={[first]} />);

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Write a message…"), { target: { value: " Servus " } });
    fireEvent.click(send);

    await waitFor(() => expect(screen.getByText("Servus")).toBeInTheDocument());
    expect(mocks.send).toHaveBeenCalledWith(CONV, "Servus");
    expect(screen.getByLabelText("Write a message…")).toHaveValue("");
    expect(mocks.poll).toHaveBeenLastCalledWith(CONV, first.createdAt);
  });

  it("sends with Enter and keeps the text when refused", async () => {
    mocks.send.mockResolvedValue("rate_limited");
    render(<ChatThread conversationId={CONV} title="Crew" initialMessages={[]} />);

    expect(screen.getByText("No messages yet. Say hello.")).toBeInTheDocument();
    const input = screen.getByLabelText("Write a message…");
    fireEvent.change(input, { target: { value: "hi" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("at most 30 messages a minute"));
    expect(input).toHaveValue("hi");
  });

  it("polls for new messages while visible", async () => {
    vi.useFakeTimers();
    mocks.poll.mockResolvedValue([]);
    render(<ChatThread conversationId={CONV} title="Crew" initialMessages={[first]} />);

    mocks.poll.mockResolvedValueOnce([{ ...first, id: "m9", body: "Wo seid ihr?", createdAt: "2026-10-05T10:05:00Z" }]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(screen.getByText("Wo seid ihr?")).toBeInTheDocument();
  });

  it("opens report and block for a direct chat", () => {
    render(<ChatThread conversationId={CONV} title="Lena" initialMessages={[]} other={{ id: "u2", name: "Lena" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Report or block Lena" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Report Lena");
  });

  it("lets anyone in a group chat report or block the person who wrote", () => {
    render(<ChatThread conversationId={CONV} title="Nordkette Sat" initialMessages={[first, mine]} />);
    fireEvent.click(screen.getByRole("button", { name: "Report or block Lena" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Report Lena");
    expect(screen.queryByRole("button", { name: "Report or block Me" })).not.toBeInTheDocument();
  });

  it("explains the age rule for pins before asking for the position", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    render(<ChatThread conversationId={CONV} title="Lena" initialMessages={[first]} canSharePosition={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Send my location" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/from 16/);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(mocks.sendLocation).not.toHaveBeenCalled();
  });

  it("shows a pin that opens the map, and an expired one without coordinates", () => {
    const pin: ChatMessage = { ...first, id: "p1", body: "📍", kind: "location", position: { lat: 47.26346, lng: 11.39432 } };
    const old: ChatMessage = { ...first, id: "p2", body: "📍", kind: "location", position: null, createdAt: "2026-10-05T10:03:00Z" };
    render(<ChatThread conversationId={CONV} title="Lena" initialMessages={[pin, old]} />);
    expect(screen.getByRole("link", { name: /Location · show on map/ })).toHaveAttribute("href", "/map?lat=47.26346&lng=11.39432&label=Lena");
    expect(screen.getByText(/Location \(hidden after 24 h\)/)).toBeInTheDocument();
  });

  it("sends the current position as a pin, and explains a refusal", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { latitude: 47.2, longitude: 11.3, accuracy: 8 } } as GeolocationPosition),
    );
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    mocks.sendLocation.mockResolvedValueOnce("sent").mockResolvedValueOnce("too_young");
    render(<ChatThread conversationId={CONV} title="Lena" initialMessages={[first]} />);

    fireEvent.click(screen.getByRole("button", { name: "Send my location" }));
    await waitFor(() => expect(mocks.sendLocation).toHaveBeenCalledWith(CONV, 47.2, 11.3));
    /* The button is disabled while the first pin is sending; a click
       before it is enabled again would be ignored. */
    await waitFor(() => expect(screen.getByRole("button", { name: "Send my location" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Send my location" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/from 16/);
  });
});
