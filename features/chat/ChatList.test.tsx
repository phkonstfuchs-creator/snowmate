import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatList from "./ChatList";
import ChatUnavailable from "./ChatUnavailable";
import type { ChatSummary } from "./message";

const openChat = vi.hoisted(() => vi.fn());
vi.mock("./actions", () => ({ openDirectChatAction: openChat }));

const direct: ChatSummary = {
  id: "c1", kind: "direct", otherUserId: "u2", otherName: "Lena Moser", otherHandle: "lena_m",
  rideId: null, rideResort: null, rideDate: null, lastBody: "Morgen?", lastAt: "t", lastIsMine: false, unread: 12,
};
const ride: ChatSummary = {
  ...direct, id: "c2", kind: "ride", otherUserId: null, otherName: null, otherHandle: null,
  rideId: "r", rideResort: "Nordkette", rideDate: "2026-12-05", lastBody: "Bin dabei", lastIsMine: true, unread: 0,
};

describe("ChatList", () => {
  it("lists chats with preview and unread count", () => {
    render(<ChatList chats={[direct, ride]} />);
    expect(screen.getByRole("link", { name: /Lena Moser/ })).toHaveAttribute("href", "/crew/chat/c1");
    expect(screen.getByLabelText("12 unread")).toHaveTextContent("9+");
    expect(screen.getByText("You: Bin dabei")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nordkette/ })).toHaveAttribute("href", "/crew/chat/c2");
  });

  it("explains an empty list and a failure", () => {
    const { rerender } = render(<ChatList chats={[]} />);
    expect(screen.getByText(/No chats yet/)).toBeInTheDocument();
    rerender(<ChatList chats={null} />);
    expect(screen.getByText("Messages could not be loaded. Try again shortly.")).toBeInTheDocument();
  });

  it("says when a chat is not available", () => {
    render(<ChatUnavailable reason="chat.unavailable" />);
    expect(screen.getByRole("alert")).toHaveTextContent("only chat with friends");
  });

  it("starts a chat with any friend, ride or not", async () => {
    openChat.mockResolvedValue(false);
    render(<ChatList chats={[]} friends={[{ id: "u9", name: "Max Rider", handle: "max_r" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByText(/whether or not you share a ride/)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Message Max Rider" }));
    });
    expect(openChat).toHaveBeenCalledWith("u9");
    expect(screen.getByRole("alert")).toHaveTextContent("The chat could not be opened.");
  });
});
