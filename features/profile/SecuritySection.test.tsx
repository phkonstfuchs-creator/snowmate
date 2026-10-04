import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SecuritySection from "./SecuritySection";

const mocks = vi.hoisted(() => ({
  enroll: vi.fn(),
  confirm: vi.fn(),
  disable: vi.fn(),
  updatePassword: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./security-actions", () => ({
  enrollMfaAction: mocks.enroll,
  confirmMfaAction: mocks.confirm,
  disableMfaAction: mocks.disable,
}));
vi.mock("@/features/auth/actions", () => ({ updatePasswordAction: mocks.updatePassword }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

describe("SecuritySection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets up two-factor sign-in with a QR code and a first code", async () => {
    mocks.enroll.mockResolvedValue({ status: "ok", factorId: "f-1", qrCode: "data:image/svg+xml;utf8,<svg/>", secret: "ABC123" });
    mocks.confirm.mockResolvedValue({ status: "ok", message: "Two-factor sign-in is on." });
    render(<SecuritySection mfaEnabled={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Set up" }));
    expect(await screen.findByRole("img", { name: "QR code for your authenticator app" })).toBeInTheDocument();
    expect(screen.getByText("ABC123")).toBeInTheDocument();

    const turnOn = screen.getByRole("button", { name: "Turn on" });
    expect(turnOn).toBeDisabled();
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "12a3456" } });
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
    fireEvent.click(turnOn);

    await waitFor(() => expect(screen.getByText("Two-factor sign-in is on.")).toBeInTheDocument());
    expect(mocks.confirm).toHaveBeenCalledWith("f-1", "123456");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows why setup could not start", async () => {
    mocks.enroll.mockResolvedValue({ status: "error", message: "Not available." });
    render(<SecuritySection mfaEnabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Set up" }));
    expect(await screen.findByText("Not available.")).toBeInTheDocument();
  });

  it("asks for a current code before turning two-factor off", async () => {
    mocks.disable.mockResolvedValue({ status: "error", message: "That code is not right." });
    render(<SecuritySection mfaEnabled />);
    expect(screen.getByText(/On: signing in needs a code/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));
    fireEvent.change(screen.getByLabelText(/Enter a current code/), { target: { value: "654321" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Turn off" }).at(-1)!);
    expect(await screen.findByText("That code is not right.")).toBeInTheDocument();
    expect(mocks.disable).toHaveBeenCalledWith("654321");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText(/Enter a current code/)).not.toBeInTheDocument();
  });

  it("opens the password change form", () => {
    render(<SecuritySection mfaEnabled={null} />);
    expect(screen.getByText("Status could not be loaded.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Password123!" } });
    expect(screen.getByText(/too weak/)).toBeInTheDocument();
  });
});
