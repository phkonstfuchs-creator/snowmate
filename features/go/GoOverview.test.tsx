import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import GoOverview from "./GoOverview";

const interest = {
  ride: {
    id: "10000000-0000-4000-8000-000000000001",
    resort: { id: "stubai-glacier", name: "Stubaier Gletscher" },
    startsAt: "2026-10-10T08:00:00Z",
    capacity: 4,
  },
  go: {
    id: "20000000-0000-4000-8000-000000000001",
    rideId: "10000000-0000-4000-8000-000000000001",
    minimumGroup: 3,
    needsCarpool: true,
    confirmedGroup: 2,
    hasConfirmedCarpool: false,
    groupReady: true,
    carpoolReady: false,
    ready: false,
    status: "interested" as const,
  },
};

it("omits an empty overview without inventing interests", () => {
  const { container } = render(
    <GoOverview result={{ status: "ready", data: [] }} />,
  );
  expect(container).toBeEmptyDOMElement();
});

it("shows unavailable wishes separately with a retry link", () => {
  render(<GoOverview result={{ status: "unavailable" }} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Deine Pistl-Go-Bedingungen sind gerade nicht verfügbar",
  );
  expect(
    screen.getByRole("link", { name: "Bedingungen erneut laden" }),
  ).toHaveAttribute("href", "/feed");
});

it("explains the actual group and missing confirmed seat with an explicit next step", () => {
  render(<GoOverview result={{ status: "ready", data: [interest] }} />);
  expect(
    screen.getByRole("heading", { name: "Deine Pistl-Go-Pläne" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("2 bereits bestätigt · Mindestgruppe 3 inklusive dir."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Dein bestätigter Mitfahrplatz fehlt noch."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Mitfahrt klären: Stubaier Gletscher" }),
  ).toHaveAttribute("href", `/feed/${interest.ride.id}`);
  expect(screen.getByText("10.10.2026, 10:00")).toHaveAttribute(
    "datetime",
    interest.ride.startsAt,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("leads ready wishes to manual participation and never confirms them", () => {
  render(
    <GoOverview
      result={{
        status: "ready",
        data: [
          {
            ...interest,
            go: {
              ...interest.go,
              ready: true,
              carpoolReady: true,
              hasConfirmedCarpool: true,
              status: "ready",
            },
          },
        ],
      }}
    />,
  );
  expect(
    screen.getByText(
      "Deine Bedingungen sind erfüllt. Frage deine Teilnahme selbst an.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", {
      name: "Teilnahme anfragen: Stubaier Gletscher",
    }),
  ).toHaveAttribute("href", `/feed/${interest.ride.id}`);
  expect(screen.queryByText("Teilnahme bestätigt.")).not.toBeInTheDocument();
});

it("distinguishes pending approval and confirmed wishes whose condition changed", () => {
  render(
    <GoOverview
      result={{
        status: "ready",
        data: [
          { ...interest, go: { ...interest.go, status: "confirmed" } },
          {
            ...interest,
            ride: {
              ...interest.ride,
              id: "30000000-0000-4000-8000-000000000001",
              resort: { id: "axamer-lizum", name: "Axamer Lizum" },
            },
            go: {
              ...interest.go,
              id: "40000000-0000-4000-8000-000000000001",
              status: "requested",
            },
          },
        ],
      }}
    />,
  );
  const cards = screen.getAllByRole("article");
  expect(within(cards[0]!).getByRole("alert")).toHaveTextContent(
    "Teilnahme bestätigt, aber eine Bedingung ist wieder offen.",
  );
  expect(
    within(cards[1]!).getByText(
      "Teilnahme angefragt; die Bestätigung des Gastgebers steht aus.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Teilnahme prüfen: Stubaier Gletscher" }),
  ).toBeInTheDocument();
});

it("preserves server priority and explains group-only and healthy confirmed states", () => {
  render(
    <GoOverview
      result={{
        status: "ready",
        data: [
          {
            ...interest,
            go: {
              ...interest.go,
              groupReady: false,
              needsCarpool: false,
              carpoolReady: true,
            },
          },
          {
            ...interest,
            ride: {
              ...interest.ride,
              id: "30000000-0000-4000-8000-000000000001",
              resort: { id: "axamer-lizum", name: "Axamer Lizum" },
            },
            go: {
              ...interest.go,
              id: "40000000-0000-4000-8000-000000000001",
              status: "confirmed",
              ready: true,
              carpoolReady: true,
              hasConfirmedCarpool: true,
            },
          },
        ],
      }}
    />,
  );
  expect(
    screen
      .getAllByRole("heading", { level: 3 })
      .map((element) => element.textContent),
  ).toEqual(["Stubaier Gletscher", "Axamer Lizum"]);
  expect(
    screen.getByText(
      "Es fehlen noch bestätigte Personen für deine Mindestgruppe.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Teilnahme bestätigt. Deine Bedingungen sind erfüllt."),
  ).toBeInTheDocument();
});
