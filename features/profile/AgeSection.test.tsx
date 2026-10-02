import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AgeSection from "./AgeSection";

vi.mock("./actions", () => ({ setBirthDateAction: vi.fn() }));

describe("AgeSection", () => {
  it("asks for the birth date while none is stored", () => {
    render(<AgeSection birthDate={null} isMinor />);
    expect(screen.getByLabelText("Birth date")).toHaveAttribute("type", "date");
    expect(screen.getByText("It cannot be changed afterwards.")).toBeInTheDocument();
  });

  it("shows the result instead of a form once stored", () => {
    const { rerender } = render(<AgeSection birthDate="2000-01-01" isMinor={false} />);
    expect(screen.queryByLabelText("Birth date")).not.toBeInTheDocument();
    expect(screen.getByText("18+ confirmed.")).toBeInTheDocument();
    rerender(<AgeSection birthDate="2010-01-01" isMinor />);
    expect(screen.getByText(/Under 18/)).toBeInTheDocument();
  });
});
