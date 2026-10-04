import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import MfaVerifyScreen from "./MfaVerifyScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";

vi.mock("./actions", () => ({
  signOutAction: vi.fn(),
  verifyLoginMfaAction: vi.fn(),
  requestPasswordResetAction: vi.fn(),
  updatePasswordAction: vi.fn(),
}));

describe("auth screens", () => {
  it("asks for the six-digit code", () => {
    render(<MfaVerifyScreen />);
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
    expect(confirm).toBeEnabled();
    expect(screen.getByRole("button", { name: "Sign in with another account" })).toBeInTheDocument();
  });

  it("requests a reset link by email", () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send link" })).toBeInTheDocument();
  });

  it("sets a new password with the strength hint", () => {
    render(<ResetPasswordScreen />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Fresh-Powder-2026" } });
    expect(screen.getByText(/Strength/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save password" })).toBeInTheDocument();
  });
});
