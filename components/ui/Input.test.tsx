import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Input from "./Input";

describe("Input", () => {
  it("associates helper and error text via aria-describedby and aria-invalid", () => {
    render(
      <Input label="Password" name="password" type="password" error="Too short" />,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "Too short",
    );
  });

  it("toggles password visibility via an accessible button", () => {
    render(<Input label="Password" name="password" type="password" />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("does not render a visibility toggle for non-password inputs", () => {
    render(<Input label="Email" name="email" type="email" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
