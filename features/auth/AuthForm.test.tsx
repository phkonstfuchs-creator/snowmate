import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialAuthActionState } from "./action-state";
import AuthForm from "./AuthForm";

const mocks = vi.hoisted(() => ({
  useActionState: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: mocks.useActionState,
  };
});

vi.mock("./actions", () => ({
  signInAction: vi.fn(),
  signUpAction: vi.fn(),
}));

describe("AuthForm", () => {
  beforeEach(() => {
    mocks.useActionState.mockReturnValue([
      initialAuthActionState,
      vi.fn(),
      false,
    ]);
  });

  it("renders the compact login fields", () => {
    render(<AuthForm mode="login" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("renders strong-password guidance for signup", () => {
    render(<AuthForm mode="signup" />);

    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByText(
        "At least 12 characters with upper and lower case and a number",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("shows field and action errors without exposing a password", () => {
    mocks.useActionState.mockReturnValue([
      {
        status: "error",
        message: "Check the highlighted fields.",
        email: "invalid",
        fieldErrors: {
          email: ["Enter a valid email address."],
        },
      },
      vi.fn(),
      false,
    ]);

    render(<AuthForm mode="login" />);

    expect(screen.getByDisplayValue("invalid")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(
      screen.getByText("Check the highlighted fields."),
    ).toBeInTheDocument();
  });

  it("shows the email-confirmation state after signup", () => {
    mocks.useActionState.mockReturnValue([
      {
        status: "success",
        message:
          "If this address can be used, you'll receive a confirmation email shortly.",
      },
      vi.fn(),
      false,
    ]);

    render(<AuthForm mode="signup" />);

    expect(screen.getByText("Request received")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("disables submission while authentication is pending", () => {
    mocks.useActionState.mockReturnValue([
      initialAuthActionState,
      vi.fn(),
      true,
    ]);

    render(<AuthForm mode="login" />);

    expect(
      screen.getByRole("button", { name: "Wird angemeldet…" }),
    ).toBeDisabled();
  });

  it("moves focus to the first invalid field after a field-error response", () => {
    mocks.useActionState.mockReturnValue([
      initialAuthActionState,
      vi.fn(),
      false,
    ]);
    const { rerender } = render(<AuthForm mode="login" />);

    mocks.useActionState.mockReturnValue([
      {
        status: "error",
        message: "Check the highlighted fields.",
        email: "invalid",
        fieldErrors: { email: ["Enter a valid email address."] },
      },
      vi.fn(),
      false,
    ]);
    rerender(<AuthForm mode="login" />);

    expect(screen.getByLabelText("Email")).toHaveFocus();
  });

  it("moves focus to the error summary when no field is invalid", () => {
    mocks.useActionState.mockReturnValue([
      initialAuthActionState,
      vi.fn(),
      false,
    ]);
    const { rerender } = render(<AuthForm mode="login" />);

    mocks.useActionState.mockReturnValue([
      {
        status: "error",
        message: "Email or password is incorrect.",
        email: "person@example.com",
      },
      vi.fn(),
      false,
    ]);
    rerender(<AuthForm mode="login" />);

    expect(
      screen.getByText("Email or password is incorrect."),
    ).toHaveFocus();
  });
});
