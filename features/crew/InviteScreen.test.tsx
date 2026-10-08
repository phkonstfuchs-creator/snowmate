import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InviteScreen from "./InviteScreen";
import PendingInviteSync from "./PendingInviteSync";
import InviteLinkCard from "./InviteLinkCard";
import { PENDING_INVITE_KEY } from "./invites";

const mocks = vi.hoisted(() => ({ accept: vi.fn(), create: vi.fn(), push: vi.fn() }));
vi.mock("./invite-actions", () => ({ acceptInviteAction: mocks.accept, createInviteAction: mocks.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const TOKEN = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("InviteScreen", () => {
  it("shows no name to signed-out visitors and remembers the invite", () => {
    render(<InviteScreen token={TOKEN} />);
    expect(screen.getByRole("heading")).toHaveTextContent("invited to a crew");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBe(TOKEN);
  });

  it("asks a signed-in visitor to confirm and accepts", async () => {
    localStorage.setItem(PENDING_INVITE_KEY, TOKEN);
    mocks.accept.mockResolvedValue({ ok: true, message: "You are friends now." });
    render(<InviteScreen token={TOKEN} preview={{ status: "valid", inviterName: "Lena Moser", inviterHandle: "lena_m" }} />);

    expect(screen.getByRole("heading")).toHaveTextContent("Lena Moser wants you in their crew");
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add to my crew" }));
    });
    expect(mocks.accept).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByRole("status")).toHaveTextContent("You are friends now.");
  });

  it("explains a link that no longer works", () => {
    render(<InviteScreen token={TOKEN} preview={{ status: "used", inviterName: "Lena", inviterHandle: "lena_m" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("already been used");
    expect(screen.queryByRole("button", { name: "Add to my crew" })).not.toBeInTheDocument();
  });

  it("points an unfinished profile to the profile tab", () => {
    render(<InviteScreen token={TOKEN} preview={{ status: "profile_incomplete", inviterName: null, inviterHandle: "x_y_z" }} />);
    expect(screen.getByRole("link", { name: "Go to profile" })).toHaveAttribute("href", "/profile");
  });

  it("reports a load failure", () => {
    render(<InviteScreen token={TOKEN} preview={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("could not be loaded");
  });
});

describe("PendingInviteSync", () => {
  it("brings a freshly signed-in visitor back to the invite once", () => {
    localStorage.setItem(PENDING_INVITE_KEY, TOKEN);
    render(<PendingInviteSync />);
    expect(mocks.push).toHaveBeenCalledWith(`/invite/${TOKEN}`);
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull();
  });

  it("ignores anything that is not a token", () => {
    localStorage.setItem(PENDING_INVITE_KEY, "https://evil.example");
    render(<PendingInviteSync />);
    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe("InviteLinkCard", () => {
  it("creates a link and copies it when sharing is unavailable", async () => {
    mocks.create.mockResolvedValue({ ok: true, url: `https://pistl.example/invite/${TOKEN}` });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    render(<InviteLinkCard />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Create invite link/ }));
    });

    expect(writeText).toHaveBeenCalledWith(`https://pistl.example/invite/${TOKEN}`);
    expect(screen.getByText(`https://pistl.example/invite/${TOKEN}`)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });

  it("uses the share sheet when there is one, and shows refusals", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareFn, configurable: true });
    mocks.create.mockResolvedValueOnce({ ok: true, url: `https://pistl.example/invite/${TOKEN}` });
    mocks.create.mockResolvedValueOnce({ ok: false, message: "You have 10 open invite links." });

    render(<InviteLinkCard />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Create invite link/ }));
    });
    expect(shareFn).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /New invite link/ }));
    });
    expect(screen.getByRole("status")).toHaveTextContent("10 open invite links");
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
});
