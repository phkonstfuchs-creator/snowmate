import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LiveCrewScreen from "./LiveCrewScreen";
import type { FriendGraph, FriendshipRow } from "./friendships";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  accept: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  openChat: vi.fn(),
}));

vi.mock("@/features/chat/actions", () => ({ openDirectChatAction: mocks.openChat }));

vi.mock("./actions", () => ({
  requestFriendshipAction: mocks.request,
  acceptFriendshipAction: mocks.accept,
  removeFriendshipAction: mocks.remove,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const person = (patch: Partial<FriendshipRow>): FriendshipRow => ({
  user_id: "u1",
  display_name: "Lena Moser",
  handle: "lena_m",
  city: "salzburg",
  ability_level: "off-piste",
  status: "accepted",
  direction: "outgoing",
  ...patch,
});

const graph: FriendGraph = {
  friends: [person({})],
  incoming: [person({ user_id: "u2", display_name: "Max Rider", handle: "max_r", status: "pending", direction: "incoming", city: null, ability_level: "park" })],
  outgoing: [person({ user_id: "u3", display_name: null, handle: "jo_ski", status: "pending", city: "innsbruck", ability_level: "chill" })],
};

describe("LiveCrewScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows friends, requests to answer and requests sent", () => {
    render(<LiveCrewScreen graph={graph} />);

    expect(screen.getByText("1 friend · 1 waiting for you")).toBeInTheDocument();
    expect(screen.getByText("Lena Moser")).toBeInTheDocument();
    expect(screen.getByText("@lena_m · Salzburg · Powder & freeride")).toBeInTheDocument();
    expect(screen.getByText("@max_r · Park")).toBeInTheDocument();
    expect(screen.getByText("@jo_ski · Innsbruck · Chill")).toBeInTheDocument();
  });

  it("accepts and declines requests", async () => {
    mocks.accept.mockResolvedValue(true);
    mocks.remove.mockResolvedValue(true);
    render(<LiveCrewScreen graph={graph} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(mocks.accept).toHaveBeenCalledWith("u2");
    expect(mocks.refresh).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Decline Max Rider" }));
    });
    expect(mocks.remove).toHaveBeenCalledWith("u2");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    });
    expect(mocks.remove).toHaveBeenCalledWith("u3");
  });

  it("asks before removing a friend", async () => {
    mocks.remove.mockResolvedValue(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<LiveCrewScreen graph={graph} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Lena Moser" }));
    expect(mocks.remove).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove Lena Moser" }));
    });
    expect(mocks.remove).toHaveBeenCalledWith("u1");
    confirm.mockRestore();
  });

  it("offers report or block on every person", () => {
    render(<LiveCrewScreen graph={graph} />);
    fireEvent.click(screen.getByRole("button", { name: "Report or block Lena Moser" }));
    expect(screen.getByRole("dialog", { name: "Report or block" })).toBeInTheDocument();
  });

  it("shows a failure", async () => {
    mocks.accept.mockResolvedValue(false);
    render(<LiveCrewScreen graph={graph} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("That did not work");
  });

  it("sends a request and shows the answer", async () => {
    mocks.request.mockResolvedValue({ status: "success", message: "Request sent." });
    render(<LiveCrewScreen graph={graph} />);

    /* With friends, adding sits behind one button. */
    expect(screen.queryByLabelText("Add a friend by handle")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add friend" }));
    fireEvent.change(screen.getByLabelText("Add a friend by handle"), { target: { value: "new_friend" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Ask" }).closest("form")!);
    });

    expect(mocks.request).toHaveBeenCalled();
    expect(screen.getByText("Request sent.")).toBeInTheDocument();
  });

  it("guides an empty crew and reports a load failure", () => {
    const { rerender } = render(<LiveCrewScreen graph={{ friends: [], incoming: [], outgoing: [] }} />);
    expect(screen.getByText(/No friends yet/)).toBeInTheDocument();
    expect(screen.getByText("0 friends")).toBeInTheDocument();
    /* An empty crew shows how to add someone right away. */
    expect(screen.getByLabelText("Add a friend by handle")).toBeInTheDocument();

    rerender(<LiveCrewScreen graph={null} />);
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it("puts requests waiting for you above the chats and opens a chat with a friend", async () => {
    mocks.openChat.mockResolvedValue(false);
    render(<LiveCrewScreen graph={graph} chats={[]} />);

    const waiting = screen.getByText("Max Rider");
    const chats = screen.getByRole("heading", { name: "Chats" });
    expect(waiting.compareDocumentPosition(chats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Message Lena Moser" }));
    });
    expect(mocks.openChat).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("alert")).toHaveTextContent("The chat could not be opened.");
  });
});
