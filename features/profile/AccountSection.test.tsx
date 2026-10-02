import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountSection from "./AccountSection";

vi.mock("./account-actions", () => ({ deleteAccountAction: vi.fn() }));

describe("AccountSection", () => {
  it("links the export and guards deletion behind the typed word", () => {
    render(<AccountSection />);

    expect(screen.getByRole("link", { name: /Download my data/ })).toHaveAttribute("href", "/profile/export");

    fireEvent.click(screen.getByRole("button", { name: /Delete account/ }));
    const submit = screen.getByRole("button", { name: "Delete my account" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/), { target: { value: "Delete" } });
    expect(submit).toBeEnabled();
  });
});
