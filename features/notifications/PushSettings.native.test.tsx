import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TOKEN = "ab".repeat(32);
const mocks = vi.hoisted(() => ({
  save: vi.fn(), remove: vi.fn(), owns: vi.fn(),
  permission: vi.fn(), ask: vi.fn(), register: vi.fn(), unregister: vi.fn(), stored: vi.fn(), remember: vi.fn(),
}));
vi.mock("./actions", () => ({
  saveNativePushTokenAction: mocks.save,
  deleteNativePushTokenAction: mocks.remove,
  isMyNativePushTokenAction: mocks.owns,
  savePushSubscriptionAction: vi.fn(),
  deletePushSubscriptionAction: vi.fn(),
  isMyPushSubscriptionAction: vi.fn(),
}));
vi.mock("./native-push", () => ({
  hasNativePush: () => true,
  nativePermission: mocks.permission,
  askNativePermission: mocks.ask,
  registerNativePush: mocks.register,
  unregisterNativePush: mocks.unregister,
  storedNativeToken: mocks.stored,
  rememberNativeToken: mocks.remember,
}));

import PushSettings from "./PushSettings";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockResolvedValue("prompt");
  mocks.ask.mockResolvedValue("granted");
  mocks.register.mockResolvedValue(TOKEN);
  mocks.save.mockResolvedValue("saved");
  mocks.remove.mockResolvedValue(true);
  mocks.owns.mockResolvedValue(true);
  mocks.stored.mockReturnValue(null);
  mocks.unregister.mockResolvedValue(undefined);
});

describe("PushSettings in the iPhone app", () => {
  it("is off until switched on, then stores this session's token", async () => {
    render(<PushSettings />);
    const toggle = await screen.findByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(mocks.register).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    expect(mocks.save).toHaveBeenCalledWith(TOKEN);
    expect(mocks.remember).toHaveBeenCalledWith(TOKEN);
  });

  it("does not adopt a token another account registered", async () => {
    mocks.stored.mockReturnValue(TOKEN);
    mocks.owns.mockResolvedValue(false);
    render(<PushSettings />);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("switches off by deleting the token and unregistering", async () => {
    mocks.stored.mockReturnValue(TOKEN);
    render(<PushSettings />);
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
    expect(mocks.remove).toHaveBeenCalledWith(TOKEN);
    expect(mocks.unregister).toHaveBeenCalled();
    expect(mocks.remember).toHaveBeenCalledWith(null);
  });

  it("hides the switch once iOS permission is refused", async () => {
    mocks.ask.mockResolvedValueOnce("denied");
    render(<PushSettings />);
    fireEvent.click(await screen.findByRole("switch"));
    await waitFor(() => expect(screen.queryByRole("switch")).not.toBeInTheDocument());
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("shows an error when the server refuses the token", async () => {
    mocks.save.mockResolvedValue("invalid");
    render(<PushSettings />);
    fireEvent.click(await screen.findByRole("switch"));
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(mocks.remember).not.toHaveBeenCalled();
  });
});
