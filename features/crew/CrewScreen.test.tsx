import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CrewScreen from "./CrewScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/crew" }));

describe("CrewScreen (demo)", () => {
  it("keeps links inside the prototype and switches tabs", () => {
    render(<CrewScreen />);

    expect(screen.getByRole("link", { name: "Find people" })).toHaveAttribute("href", "/demo/people");

    fireEvent.click(screen.getByRole("button", { name: "Squads" }));
    expect(screen.getByText("Create new squad")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Chats/ }));
    expect(screen.queryByText("Create new squad")).not.toBeInTheDocument();
  });

  it("opens a conversation from the crew list", () => {
    /* jsdom has no layout, so no scrollIntoView */
    Element.prototype.scrollIntoView = vi.fn();
    render(<CrewScreen />);
    const messageButton = screen.getAllByRole("button", { name: /^Message / })[0]!;
    fireEvent.click(messageButton);
    expect(screen.getByRole("dialog", { name: /^Conversation with / })).toBeInTheDocument();
  });
});
