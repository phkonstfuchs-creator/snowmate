import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badges from "./BadgeGallery";

describe("Badges", () => {
  it("shows earned and locked stamps and explains one on tap", () => {
    render(<Badges earned={new Set(["first_day"])} />);
    expect(screen.getByText("1/12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /First day/ })).toHaveTextContent("Earned: First day");
    const fast = screen.getByRole("button", { name: /100 km\/h/ });
    expect(fast).toHaveTextContent("Not yet: 100 km/h");
    fireEvent.click(fast);
    expect(screen.getByRole("status")).toHaveTextContent("Reach a top speed of 100 km/h");
  });
});
