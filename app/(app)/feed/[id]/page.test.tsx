import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RideDetailPage from "./page";
const m = vi.hoisted(() => ({
  detail: vi.fn(),
  members: vi.fn(),
  requests: vi.fn(),
  claims: vi.fn(),
  go: vi.fn(),
}));
vi.mock("@/features/go/data", () => ({ getGoStatus: m.go }));
vi.mock("@/features/rides/data", () => ({
  getRideDetail: m.detail,
  getRideMembers: m.members,
  getRideRequests: m.requests,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims: m.claims } }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/features/rides/actions", () => ({
  cancelRideAction: vi.fn(),
  leaveRideAction: vi.fn(),
  requestRideAction: vi.fn(),
  respondRideRequestAction: vi.fn(),
}));
const id = "22222222-2222-4222-8222-222222222222";
const hostId = "33333333-3333-4333-8333-333333333333";
const viewer = "44444444-4444-4444-8444-444444444444";
const ride = {
  id,
  host: { id: hostId, displayName: "Anna", handle: "anna", avatarPath: null },
  resort: { id: "axamer-lizum", name: "Axamer Lizum" },
  city: "innsbruck",
  abilityLevel: "chill",
  startsAt: "2099-01-01T10:00:00Z",
  capacity: 4,
  takenSpots: 1,
  audience: "friends",
  caption: "Powder",
  status: "scheduled",
  createdAt: "2026-01-01T10:00:00Z",
  meetingPoint: "Secret cafe",
  canViewExact: false,
};
const request = {
  id: "55555555-5555-4555-8555-555555555555",
  rideId: id,
  requester: {
    id: viewer,
    displayName: "Ben",
    handle: "ben",
    avatarPath: null,
  },
  status: "pending",
  createdAt: "2026-01-01T10:00:00Z",
  respondedAt: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.detail.mockResolvedValue({ status: "ready", data: ride });
  m.members.mockResolvedValue({ status: "ready", data: [] });
  m.requests.mockResolvedValue({ status: "ready", data: [] });
  m.go.mockResolvedValue({ status: "ready", data: null });
  m.claims.mockResolvedValue({
    data: { claims: { sub: viewer } },
    error: null,
  });
});
async function show() {
  render(await RideDetailPage({ params: Promise.resolve({ id }) }));
}
describe("real ride detail states", () => {
  it("does not offer a request when conditions cannot be verified", async () => {
    m.go.mockResolvedValue({ status: "unavailable" });
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bedingungen sind gerade nicht verfügbar",
    );
    expect(
      screen.queryByRole("button", { name: "Teilnahme anfragen" }),
    ).not.toBeInTheDocument();
  });
  it("shows unmet Go conditions instead of a direct request", async () => {
    m.go.mockResolvedValue({
      status: "ready",
      data: {
        id,
        rideId: id,
        minimumGroup: 3,
        needsCarpool: true,
        confirmedGroup: 1,
        hasConfirmedCarpool: false,
        groupReady: false,
        carpoolReady: false,
        ready: false,
        status: "interested",
      },
    });
    await show();
    expect(
      screen.getByText("Deine Bedingungen sind noch offen."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Teilnahme anfragen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bedingungen zurückziehen" }),
    ).toBeInTheDocument();
  });
  it("outsiders can request but never see a masked exact meeting point", async () => {
    await show();
    expect(
      screen.getByRole("button", { name: "Teilnahme anfragen" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Secret cafe")).not.toBeInTheDocument();
  });
  it("pending members withdraw rather than receive an immediate confirmed state", async () => {
    m.requests.mockResolvedValue({ status: "ready", data: [request] });
    await show();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Bestätigung steht noch aus",
    );
    expect(
      screen.getByRole("button", { name: "Anfrage zurückziehen" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Teilnahme anfragen" }),
    ).not.toBeInTheDocument();
  });
  it("accepted members can leave and see the allowed exact point", async () => {
    m.detail.mockResolvedValue({
      status: "ready",
      data: { ...ride, canViewExact: true },
    });
    m.requests.mockResolvedValue({
      status: "ready",
      data: [{ ...request, status: "accepted" }],
    });
    await show();
    expect(screen.getByRole("status")).toHaveTextContent("bestätigt");
    expect(screen.getByText("Secret cafe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Teilnahme absagen" }),
    ).toBeInTheDocument();
  });
  it("hosts see pending requests and can accept or reject", async () => {
    m.claims.mockResolvedValue({
      data: { claims: { sub: hostId } },
      error: null,
    });
    m.requests.mockResolvedValue({ status: "ready", data: [request] });
    await show();
    expect(
      screen.getByRole("button", { name: "Annehmen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ablehnen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ausfahrt absagen" }),
    ).toBeInTheDocument();
  });
  it("failed participant load prevents action controls", async () => {
    m.members.mockResolvedValue({ status: "unavailable" });
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent("nicht verfügbar");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("rejects invalid route identifiers before querying", async () => {
    await expect(
      RideDetailPage({ params: Promise.resolve({ id: "bad" }) }),
    ).rejects.toThrow("404");
    expect(m.detail).not.toHaveBeenCalled();
  });
  it("renders unavailable and not-found detail correctly", async () => {
    m.detail.mockResolvedValue({ status: "unavailable" });
    await show();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "gerade nicht verfügbar",
    );
    m.detail.mockResolvedValue({ status: "not-found" });
    await expect(
      RideDetailPage({ params: Promise.resolve({ id }) }),
    ).rejects.toThrow("404");
  });
});
