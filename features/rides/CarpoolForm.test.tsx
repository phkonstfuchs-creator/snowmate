import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CarpoolForm from "./CarpoolForm";
const { create, push, refresh } = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("./actions", () => ({ createCarpoolAction: create }));
beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({ ok: true, id: "saved-id" });
});
function fill() {
  fireEvent.change(screen.getByLabelText("Zielgebiet"), {
    target: { value: "stubai" },
  });
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateInput = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  fireEvent.change(screen.getByLabelText("Abfahrt: Datum und Uhrzeit"), {
    target: { value: dateInput },
  });
  fireEvent.change(screen.getByLabelText("Genauer Abfahrtsort"), {
    target: { value: "Innsbruck Hbf" },
  });
}
it("creates a persisted offer and navigates only after success", async () => {
  render(
    <CarpoolForm
      city="innsbruck"
      resorts={[{ id: "stubai", name: "Stubai" }]}
    />,
  );
  fill();
  fireEvent.click(
    screen.getByRole("button", { name: "Inserat veröffentlichen" }),
  );
  await waitFor(() =>
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        city: "innsbruck",
        resortId: "stubai",
        totalSeats: 3,
        departurePoint: "Innsbruck Hbf",
      }),
    ),
  );
  expect(push).toHaveBeenCalledWith("/carpool/saved-id");
});
it("keeps rider searches at one seat and retains the key on retry", async () => {
  create.mockResolvedValue({ ok: false, message: "Offline" });
  render(
    <CarpoolForm
      city="innsbruck"
      resorts={[{ id: "stubai", name: "Stubai" }]}
    />,
  );
  fill();
  fireEvent.change(screen.getByLabelText("Rolle"), {
    target: { value: "rider" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Inserat veröffentlichen" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Inserat veröffentlichen" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Inserat veröffentlichen" }),
  );
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  expect(create.mock.calls[0]?.[0].totalSeats).toBe(1);
  expect(create.mock.calls[0]?.[0].idempotencyKey).toBe(
    create.mock.calls[1]?.[0].idempotencyKey,
  );
  expect(push).not.toHaveBeenCalled();
});
it("shows date validation before invoking the server", async () => {
  render(
    <CarpoolForm
      city="innsbruck"
      resorts={[{ id: "stubai", name: "Stubai" }]}
    />,
  );
  fill();
  fireEvent.change(screen.getByLabelText("Abfahrt: Datum und Uhrzeit"), {
    target: { value: "2020-01-01T08:00" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Inserat veröffentlichen" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("90 Tage");
  expect(create).not.toHaveBeenCalled();
});
