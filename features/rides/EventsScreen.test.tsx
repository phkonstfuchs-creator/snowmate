import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PUBLIC_EVENTS } from "@/lib/data";
import EventsScreen from "./EventsScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/events" }));

/* Der Screen ist das erste Fenster nach draussen. Die Tests decken
   deshalb vor allem ab, was Fremde sehen duerfen und was nicht. */

function openFirstEvent() {
  fireEvent.click(screen.getAllByRole("button", { name: /Jan/ })[0]!);
  return screen.getByRole("dialog");
}

describe("EventsScreen", () => {
  it("states the visibility rule on the screen where it applies", () => {
    render(<EventsScreen />);

    expect(screen.getByText("Für alle offen")).toBeInTheDocument();
    expect(
      screen.getByText(/den genauen Treffpunkt erst, wer zugesagt hat/),
    ).toBeInTheDocument();
  });

  it("lists only events of the selected region", () => {
    render(<EventsScreen />);

    expect(screen.getByText("Erstsemester-Tag Axamer Lizum")).toBeInTheDocument();
    expect(screen.queryByText("Season Opening Saalbach")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salzburg" }));

    expect(screen.getByText("Season Opening Saalbach")).toBeInTheDocument();
    expect(
      screen.queryByText("Erstsemester-Tag Axamer Lizum"),
    ).not.toBeInTheDocument();
  });

  it("sorts full events below the ones you can still join", () => {
    render(<EventsScreen />);

    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    // Ladies Powder Morning ist voll (12/12) und darf nicht oben stehen.
    expect(titles.indexOf("Ladies Powder Morning")).toBe(titles.length - 1);
  });

  it("hides the meeting point from someone who has not joined", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(
      within(dialog).getByText(/Treffpunkt wird nach der Zusage sichtbar/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText("Bushaltestelle Axams Zentrum"),
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

    fireEvent.click(within(dialog).getByRole("button", { name: "Zusagen" }));
    expect(
      within(dialog).getByText("Bushaltestelle Axams Zentrum"),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Zusage zurückziehen" }),
    );
    expect(
      within(dialog).getByText(/Treffpunkt wird nach der Zusage sichtbar/),
    ).toBeInTheDocument();
  });

  it("counts the joined seat while you are in", () => {
    render(<EventsScreen />);
    const dialog = openFirstEvent();

    expect(within(dialog).getByText("23/40")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Zusagen" }));
    expect(within(dialog).getByText("24/40")).toBeInTheDocument();
  });

  it("blocks joining a full event", () => {
    render(<EventsScreen />);
    fireEvent.click(screen.getByText("Ladies Powder Morning"));

    const dialog = screen.getByRole("dialog");
    const cta = within(dialog).getByRole("button", { name: "Event ist voll" });
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Zusagen" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Event schließen" }));

    expect(screen.getByText("Zugesagt")).toBeInTheDocument();
  });

  it("only ever renders events flagged public", () => {
    render(<EventsScreen />);

    const rendered = PUBLIC_EVENTS.filter((event) =>
      screen.queryByText(event.title!),
    );
    expect(rendered.every((event) => event.visibility === "public")).toBe(true);
  });
});
