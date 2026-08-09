import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PeopleScreen from "./PeopleScreen";

vi.mock("next/navigation", () => ({ usePathname: () => "/people" }));

function renderScreen() {
  render(<PeopleScreen />);
}

function openRequests() {
  fireEvent.click(screen.getByRole("button", { name: /^Anfragen/ }));
}

describe("PeopleScreen", () => {
  it("suggests people with mutual friends before everyone else", () => {
    renderScreen();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Gemeinsame Freunde", "Weitere in deiner Region"]);
  });

  it("never lists the signed-in user or an existing friend", () => {
    renderScreen();

    expect(screen.queryByText("Felix Gruber")).not.toBeInTheDocument();
    expect(screen.queryByText("Sophie Wagner")).not.toBeInTheDocument();
  });

  it("filters the list down to a search match", () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/suchen/i), {
      target: { value: "clara" },
    });

    expect(screen.getByText("Treffer")).toBeInTheDocument();
    expect(screen.getByText("Clara Schmid")).toBeInTheDocument();
    expect(screen.queryByText("David Winkler")).not.toBeInTheDocument();
  });

  it("accepts a handle written with a leading at sign", () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/suchen/i), {
      target: { value: "@dav.winkler" },
    });

    expect(screen.getByText("David Winkler")).toBeInTheDocument();
  });

  it("explains an empty search instead of showing a blank list", () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText(/suchen/i), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText("Niemanden gefunden")).toBeInTheDocument();
  });

  it("marks a sent request and allows withdrawing it", () => {
    renderScreen();

    const send = screen.getByRole("button", { name: "Clara Schmid anfragen" });
    fireEvent.click(send);

    const sent = screen.getByRole("button", {
      name: "Anfrage an Clara Schmid zurückziehen",
    });
    expect(sent).toHaveTextContent("Gesendet");

    fireEvent.click(sent);
    expect(
      screen.getByRole("button", { name: "Clara Schmid anfragen" }),
    ).toHaveTextContent("Anfragen");
  });

  it("counts open requests in the header and decrements on a decision", () => {
    renderScreen();
    expect(screen.getByText(/3 offene Anfragen/)).toBeInTheDocument();

    openRequests();
    fireEvent.click(screen.getAllByRole("button", { name: "Annehmen" })[0]!);

    expect(screen.getByText(/2 offene Anfragen/)).toBeInTheDocument();
  });

  it("uses the singular when one request is left", () => {
    renderScreen();
    openRequests();

    fireEvent.click(screen.getAllByRole("button", { name: "Annehmen" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Ablehnen" })[0]!);

    expect(screen.getByText(/1 offene Anfrage$/)).toBeInTheDocument();
  });

  it("shows the outcome of a decided request and drops its buttons", () => {
    renderScreen();
    openRequests();

    fireEvent.click(screen.getAllByRole("button", { name: "Annehmen" })[0]!);
    expect(screen.getByText("In der Crew")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Ablehnen" })[0]!);
    expect(screen.getByText("Abgelehnt")).toBeInTheDocument();
  });

  it("flags a minor in the request list so the decision is informed", () => {
    renderScreen();
    openRequests();

    const row = screen.getByText("Lena Brunner").closest("li");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("U18")).toBeInTheDocument();
  });

  it("links back to the crew screen", () => {
    renderScreen();

    expect(screen.getByRole("link", { name: "Zurück zur Crew" })).toHaveAttribute(
      "href",
      "/crew",
    );
  });
});

describe("PeopleScreen inside the prototype", () => {
  it("keeps the back link within the demo prefix", async () => {
    vi.resetModules();
    vi.doMock("next/navigation", () => ({ usePathname: () => "/demo/people" }));

    const { default: DemoPeopleScreen } = await import("./PeopleScreen");
    render(<DemoPeopleScreen />);

    expect(screen.getByRole("link", { name: "Zurück zur Crew" })).toHaveAttribute(
      "href",
      "/demo/crew",
    );
  });
});
