import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupCodeScreen from "./SignupCodeScreen";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), resend: vi.fn() }));
vi.mock("./actions", () => ({ verifySignupCodeAction: mocks.verify, resendSignupCodeAction: mocks.resend }));

describe("SignupCodeScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("names the masked address and waits for a full code", () => {
    render(<SignupCodeScreen maskedEmail="l•••@example.com" />);

    expect(screen.getByText(/l•••@example.com/)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Code from the email"), { target: { value: "12a34 56" } });
    expect(screen.getByLabelText("Code from the email")).toHaveValue("1234 56");
    expect(confirm).toBeEnabled();
  });

  it("shows why a code was refused", async () => {
    mocks.verify.mockResolvedValue({ status: "error", message: "This code is wrong or has expired." });
    render(<SignupCodeScreen maskedEmail="l•••@example.com" />);

    fireEvent.change(screen.getByLabelText("Code from the email"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("wrong or has expired"));
  });

  it("can send a new code", async () => {
    mocks.resend.mockResolvedValue({ status: "success", message: "A new email is on its way." });
    render(<SignupCodeScreen maskedEmail="l•••@example.com" />);

    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("on its way"));
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  });
});
