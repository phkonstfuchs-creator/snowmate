import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "./page";
const { detail, members, requests, claims, client } = vi.hoisted(() => ({
  detail: vi.fn(),
  members: vi.fn(),
  requests: vi.fn(),
  claims: vi.fn(),
  client: vi.fn(),
}));
vi.mock("@/features/rides/data", () => ({
  getCarpoolDetail: detail,
  getCarpoolMembers: members,
  getCarpoolRequests: requests,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: client }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("404");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/features/rides/actions", () => ({
  cancelCarpoolAction: vi.fn(),
  requestCarpoolAction: vi.fn(),
  respondCarpoolRequestAction: vi.fn(),
  leaveCarpoolAction: vi.fn(),
}));
const id = "a1111111-1111-4111-8111-111111111111";
const carpool = {
  id,
  host: { id, displayName: "Lena", handle: "lena", avatarPath: null },
  resort: { id: "stubai", name: "Stubai" },
  city: "innsbruck",
  role: "driver",
  departsAt: "2090-01-01T08:00:00Z",
  seatCapacity: 3,
  availableSeats: 2,
  audience: "friends",
  note: "Skis",
  status: "scheduled",
  createdAt: "2026-01-01T08:00:00Z",
  departurePoint: "Private address",
  canViewExact: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  detail.mockResolvedValue({ status: "ready", data: carpool });
  members.mockResolvedValue({ status: "ready", data: [] });
  requests.mockResolvedValue({ status: "ready", data: [] });
  claims.mockResolvedValue({
    data: { claims: { sub: "visitor" } },
    error: null,
  });
  client.mockResolvedValue({ auth: { getClaims: claims } });
});
it("never renders a masked private departure value", async () => {
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(screen.queryByText("Private address")).not.toBeInTheDocument();
  expect(screen.getByText(/genaue Abfahrtsort/)).toBeInTheDocument();
});
it("shows exact departure and host controls only for verified host identity", async () => {
  detail.mockResolvedValue({
    status: "ready",
    data: { ...carpool, canViewExact: true },
  });
  claims.mockResolvedValue({ data: { claims: { sub: id } }, error: null });
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(screen.getByText("Private address")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Mitfahrt absagen" }),
  ).toBeInTheDocument();
});
it("does not offer mutations when claims cannot be verified", async () => {
  claims.mockResolvedValue({
    data: { claims: { sub: id } },
    error: new Error("claims unavailable"),
  });
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(
    screen.queryByRole("button", { name: "Mitfahrt absagen" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Platz anfragen" }),
  ).not.toBeInTheDocument();
});
it("handles unavailable identity without crashing", async () => {
  client.mockRejectedValue(new Error("offline"));
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(screen.getByText(/Identität/)).toBeInTheDocument();
});
it("renders recoverable data unavailable state", async () => {
  detail.mockResolvedValue({ status: "unavailable" });
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(screen.getByRole("alert")).toHaveTextContent("nicht geladen");
  expect(
    screen.getByRole("link", { name: "Erneut laden" }),
  ).toBeInTheDocument();
});
it("rejects invalid or missing ids", async () => {
  await expect(
    Page({ params: Promise.resolve({ id: "invalid" }) }),
  ).rejects.toThrow("404");
  detail.mockResolvedValue({ status: "not-found" });
  await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow(
    "404",
  );
});
it("does not offer requests for a past departure", async () => {
  detail.mockResolvedValue({
    status: "ready",
    data: { ...carpool, departsAt: "2020-01-01T08:00:00Z" },
  });
  render(await Page({ params: Promise.resolve({ id }) }));
  expect(
    screen.queryByRole("button", { name: "Platz anfragen" }),
  ).not.toBeInTheDocument();
});
