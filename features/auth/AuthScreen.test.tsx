import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthScreen from "./AuthScreen";

vi.mock("./AuthForm", () => ({
  default: ({ mode }: { mode: string }) => <div>auth-form-{mode}</div>,
}));

describe("AuthScreen", () => {
  it("renders the login screen", () => {
    render(<AuthScreen mode="login" />);

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("auth-form-login")).toBeInTheDocument();
  });

  it("renders signup without a nested marketing layout", () => {
    render(<AuthScreen mode="signup" />);

    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByText("auth-form-signup")).toBeInTheDocument();
  });

  it("shows an invalid confirmation notice only when requested", () => {
    const { rerender } = render(
      <AuthScreen mode="login" confirmationFailed />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "invalid or expired",
    );

    rerender(<AuthScreen mode="login" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
