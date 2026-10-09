import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MountainPreview from "./MountainPreview";

vi.mock("next/dynamic", () => ({ default: () => () => <div aria-label="Pilotkarte" /> }));
vi.mock("./data/catalog", () => ({ pilotFeatures: [
  { id: "osm:way:1", name: "Seegrubenbahn", kind: "lift", duration: "8 min" },
  { id: "osm:way:2", name: "Frau-Hitt-Warte", kind: "piste", difficulty: "intermediate" },
  ...Array.from({ length: 9 }, (_, index) => ({ id: `osm:way:zweier-${index}`, name: "2 - Zweier Skiroute", kind: "piste", difficulty: "freeride" })),
] }));
vi.mock("./GoPlanner", () => ({ default: ({ onComplete, onClose }: { onComplete: (plan: unknown) => void; onClose: () => void }) => <div role="dialog" aria-label="Pistl Go">
  <button onClick={() => onComplete({ resort: "Nordkette", date: "2026-12-12", time: "09:00", transport: "own", meeting: "Seegrube", crew: [] })}>Privaten Entwurf speichern</button>
  <button onClick={onClose}>Schließen</button>
</div> }));

afterEach(() => vi.useRealTimers());

describe("Mountain preview journeys", () => {
  it("keeps every matching ski-route section available in search", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Piste oder Lift suchen" }), { target: { value: "Zweier" } });
    expect(screen.getAllByRole("button", { name: "2 - Zweier Skiroute auswählen" })).toHaveLength(9);
  });
  it("makes planning possible with no existing plan and labels the preview", () => {
    render(<MountainPreview />);
    expect(screen.getByText(/Designvorschau/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Skitag planen/ }));
    expect(screen.getByRole("dialog", { name: "Pistl Go" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Privaten Entwurf speichern" }));
    expect(screen.getByText("Dein Plan steht." )).toBeInTheDocument();
    expect(screen.getByText(/Nur in dieser Vorschau/)).toBeInTheDocument();
  });

  it("keeps replay explicit and stops playback when leaving the mountain", () => {
    vi.useFakeTimers();
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    fireEvent.click(screen.getByRole("button", { name: "Mein Tag" }));
    expect(screen.getByText(/Beispielroute/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wiedergabe starten" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wiedergabe starten" }));
    expect(screen.getByRole("button", { name: "Wiedergabe pausieren" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Heute" }));
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    expect(screen.getByRole("button", { name: "Wiedergabe starten" })).toBeInTheDocument();
  });

  it("makes imported lift geometry selectable without asserting live opening status", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Piste oder Lift suchen" }), { target: { value: "Seegruben" } });
    fireEvent.click(screen.getByRole("button", { name: /Seegrubenbahn auswählen/ }));
    expect(screen.getByRole("heading", { name: "Seegrubenbahn" })).toBeInTheDocument();
    expect(screen.getByText("Betriebsstatus unbekannt")).toBeInTheDocument();
    expect(screen.getByText(/Wartezeit unbekannt/)).toBeInTheDocument();
  });

  it("offers official webcams without implying a fresh camera image", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    fireEvent.click(screen.getByRole("button", { name: "Webcams" }));
    expect(screen.getByRole("link", { name: /Nordkette.*Webcams/ })).toHaveAttribute("href", "https://nordkette.com/en/cams/");
    expect(screen.getByRole("link", { name: /Stubai.*Webcams/ })).toHaveAttribute("href", "https://www.stubaier-gletscher.com/stubai-live/webcams/");
  });

  it("simulates friend sharing without requesting or publishing a location", () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition, watchPosition: vi.fn() } });
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Ich" }));
    fireEvent.click(screen.getByRole("switch", { name: "Dauerhaft für Freunde — Vorschau" }));
    expect(screen.getByText(/Kein Standort wird geteilt/)).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("supports horizontal crew tab swipes while leaving vertical gestures alone", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Crew" }));
    const panel = screen.getByRole("tabpanel");
    fireEvent.touchStart(panel, { touches: [{ clientX: 240, clientY: 200 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 200, clientY: 360 }] });
    expect(screen.getByRole("tab", { name: "Meine Crew" })).toHaveAttribute("aria-selected", "true");
    fireEvent.touchStart(panel, { touches: [{ clientX: 240, clientY: 200 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 70, clientY: 205 }] });
    expect(screen.getByRole("tab", { name: "Entdecken" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Entdecken" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Meine Crew" })).toHaveAttribute("aria-selected", "true");
  });

  it("retains an earlier draft when another day is planned", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Skitag planen" }));
    fireEvent.click(screen.getByRole("button", { name: "Privaten Entwurf speichern" }));
    fireEvent.click(screen.getByRole("button", { name: "Neuen Skitag planen" }));
    fireEvent.click(screen.getByRole("button", { name: "Privaten Entwurf speichern" }));
    expect(screen.getByRole("region", { name: "Weitere private Entwürfe" })).toBeInTheDocument();
  });

  it("does not leak a selected map feature into the Crew meetup", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Berg" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Seegruben" } });
    fireEvent.click(screen.getByRole("button", { name: /Seegrubenbahn auswählen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Crew" }));
    fireEvent.click(screen.getByRole("button", { name: /Seegrube · 12:30/ }));
    expect(screen.getByRole("dialog", { name: "Wir sehen uns oben." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seegrube" })).toBeInTheDocument();
  });

  it("swipes rider cards separately from tabs and ignores vertical card gestures", () => {
    render(<MountainPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Crew" }));
    fireEvent.click(screen.getByRole("tab", { name: "Entdecken" }));
    const card = screen.getByRole("group", { name: "Rider-Vorschau" });
    fireEvent.touchStart(card, { touches: [{ clientX: 220, clientY: 200 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 215, clientY: 360 }] });
    fireEvent.touchEnd(card, { changedTouches: [{ clientX: 215, clientY: 360 }] });
    expect(screen.getByRole("heading", { name: "Jules" })).toBeInTheDocument();
    fireEvent.touchStart(card, { touches: [{ clientX: 220, clientY: 200 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 65, clientY: 202 }] });
    fireEvent.touchEnd(card, { changedTouches: [{ clientX: 65, clientY: 202 }] });
    expect(screen.getByRole("heading", { name: "Noah" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Entdecken" })).toHaveAttribute("aria-selected", "true");
    fireEvent.touchStart(card, { touches: [{ clientX: 50, clientY: 200 }] });
    fireEvent.touchEnd(card, { changedTouches: [{ clientX: 230, clientY: 203 }] });
    expect(screen.getByRole("status")).toHaveTextContent("keine Anfrage versendet");
  });
});
