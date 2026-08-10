import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PUBLIC_EVENTS } from "@/lib/data";
import EventsScreen from "./EventsScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/events" }));

/* This screen is the first window facing outward, so the tests
   mainly cover what strangers may and may not see. */

function openFirstEvent() {
  fireEvent.click(screen.getAllByRole("button", { name: /Jan/ })[0]!);
  return screen.getByRole("dialog");
}

describe("EventsScreen", () => {
  it("states the visibility rule on the screen where it applies", () => {
    render(<EventsScreen />);

    expect(screen.getByText("Open to everyone")).toBeInTheDocument();
    expect(
      screen.getByText(/only those who joined see the exact meeting point/),
    ).toBeInTheDocument();
  });

  it("lists only events of the selected region", () => {
    render(<EventsScreen />);

    expect(screen.getByText("Freshers Day Axamer Lizum")).toBeInTheDocument();
    expect(screen.queryByText("Season Opening Saalbach")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salzburg" }));

    expect(screen.getByText("Season Opening Saalbach")).toBeInTheDocument();
    expect(
      screen.queryByText("Freshers Day Axamer Lizum"),
    ).not.toBeInTheDocument();
  });

  it("sorts full events below the ones you can still join", () => {
    render(<EventsScreen />);

    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    // Ladies Powder Morning is full (12/12) and must not sit at the top.
    expect(titles.indexOf("Ladies Powder Morning")).toBe(titles.length - 1);
  });

  it("hides the meeting point from someone who has not joined", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(
      within(dialog).getByText(/Exact meeting point becomes visible once you join/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Axams centre bus stop"),
    ).not.toBeInTheDocument();
  });

  it("still shows the resort and time to everyone", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(within(dialog).getByText(/09:30/)).toBeInTheDocument();
    expect(within(dialog).getByText("Julia Mayer")).toBeInTheDocument();
  });

  it("reveals the meeting point once you join and hides it again on withdrawal", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    fireEvent.click(within(dialog).getByRole("button", { name: "Join event" }));
    expect(
      within(dialog).getByText("Axams centre bus stop"),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Leave event" }),
    );
    expect(
      within(dialog).getByText(/Exact meeting point becomes visible once you join/),
    ).toBeInTheDocument();
  });

  it("counts the joined seat while you are in", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(within(dialog).getByText("23/40")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Join event" }));
    expect(within(dialog).getByText("24/40")).toBeInTheDocument();
  });

  it("blocks joining a full event", () => {
    render(<EventsScreen />);
    fireEvent.click(screen.getByText("Ladies Powder Morning"));

    const dialog = screen.getByRole("dialog");
    const cta = within(dialog).getByRole("button", { name: "Event is full" });
    expect(cta).toBeDisabled();
  });

  it("does not repeat the resort when the title already names it", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(within(dialog).getAllByText(/Axamer Lizum/)).toHaveLength(1);
  });

  it("marks a joined event in the list", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();
    fireEvent.click(within(dialog).getByRole("button", { name: "Join event" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close event" }));

    expect(screen.getByText("Joined")).toBeInTheDocument();
  });

  it("only ever renders events flagged public", () => {
    render(<EventsScreen />);

    const rendered = PUBLIC_EVENTS.filter((event) =>
      screen.queryByText(event.title!),
    );
    expect(rendered.every((event) => event.visibility === "public")).toBe(true);
  });
});

describe("EventsScreen accessibility", () => {
  /* The card titles used to be h3 under an h1, skipping a level.
     Screen readers navigate by headings, so the jump hid the list
     structure. */
  it("keeps the heading levels sequential", () => {
    render(<EventsScreen />);

    const levels = screen
      .getAllByRole("heading")
      .map((h) => Number(h.tagName[1]));

    expect(levels[0]).toBe(1);

    const jumps = levels.flatMap((level, i) => {
      const previous = levels[i - 1];
      return previous !== undefined && level - previous > 1
        ? [`h${previous} -> h${level}`]
        : [];
    });
    expect(jumps).toEqual([]);
  });

  it("gives every control an accessible name", () => {
    render(<EventsScreen />);

    const unnamed = screen
      .getAllByRole("button")
      .filter((b) => !(b.getAttribute("aria-label") || b.textContent || "").trim());

    expect(unnamed).toEqual([]);
  });
});
