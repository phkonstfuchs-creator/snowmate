import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MOCK_USERS } from "@/lib/data";
import UserProfileSheet from "./UserProfileSheet";

describe("UserProfileSheet", () => {
  it("restores profile scroll and focus after closing a conversation", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const user = MOCK_USERS.find((candidate) => candidate.id !== "me");
    expect(user).toBeDefined();

    render(<UserProfileSheet user={user!} onClose={vi.fn()} />);

    const profile = screen.getByRole("dialog", {
      name: `Profil von ${user!.name}`,
    });
    const messageButton = screen.getByRole("button", { name: "Nachricht" });
    profile.scrollTop = 120;

    fireEvent.click(messageButton);
    fireEvent.click(
      screen.getByRole("button", { name: "Unterhaltung schließen" }),
    );

    await waitFor(() => expect(messageButton).toHaveFocus());
    expect(profile.scrollTop).toBe(120);
  });
});
