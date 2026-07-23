import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SegmentedControl from "./SegmentedControl";

describe("SegmentedControl", () => {
  it("exposes the selected option and changes it by user action", () => {
    const onChange = vi.fn();

    render(
      <SegmentedControl
        options={[
          { value: "innsbruck", label: "Innsbruck" },
          { value: "salzburg", label: "Salzburg" },
        ]}
        value="innsbruck"
        onChange={onChange}
        ariaLabel="Region"
      />,
    );

    expect(screen.getByRole("group", { name: "Region" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Innsbruck" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Salzburg" }));
    expect(onChange).toHaveBeenCalledWith("salzburg");
  });
});
