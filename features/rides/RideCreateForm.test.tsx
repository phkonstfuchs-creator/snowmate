import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RideCreateForm from "./RideCreateForm";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./actions", () => ({ createRideAction: mocks.create }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
beforeEach(() => vi.clearAllMocks());
function fillForm() {
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  fireEvent.change(screen.getByLabelText(/Datum und Uhrzeit/), {
    target: { value: date },
  });
  fireEvent.change(screen.getByLabelText("Genauer Treffpunkt"), {
    target: { value: "Talstation" },
  });
}
describe("ride creation", () => {
  it("validates before persisting", async () => {
    render(
      <RideCreateForm
        resorts={[{ id: "axamer-lizum", name: "Axamer Lizum" }]}
      />,
    );
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Ausfahrt veröffentlichen" })
        .closest("form")!,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Datum");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("navigates to the persisted detail only after success", async () => {
    mocks.create.mockResolvedValue({ ok: true, id: "new-ride" });
    render(
      <RideCreateForm
        resorts={[{ id: "axamer-lizum", name: "Axamer Lizum" }]}
      />,
    );
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Ausfahrt veröffentlichen" }),
    );
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/feed/new-ride"),
    );
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      resortId: "axamer-lizum",
      meetingPoint: "Talstation",
      capacity: 4,
      audience: "friends",
    });
  });
  it("preserves retry key until the payload changes", async () => {
    mocks.create.mockResolvedValue({
      ok: false,
      message: "Server nicht erreichbar.",
    });
    render(
      <RideCreateForm
        resorts={[{ id: "axamer-lizum", name: "Axamer Lizum" }]}
      />,
    );
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Ausfahrt veröffentlichen" }),
    );
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "Ausfahrt veröffentlichen" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.create.mock.calls[0]?.[0].idempotencyKey).toBe(
      mocks.create.mock.calls[1]?.[0].idempotencyKey,
    );
    fireEvent.change(screen.getByLabelText("Notiz"), {
      target: { value: "Powder" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ausfahrt veröffentlichen" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(3));
    expect(mocks.create.mock.calls[2]?.[0].idempotencyKey).not.toBe(
      mocks.create.mock.calls[1]?.[0].idempotencyKey,
    );
  });
  it("shows network failures without redirecting", async () => {
    mocks.create.mockRejectedValue(new Error("offline"));
    render(
      <RideCreateForm
        resorts={[{ id: "axamer-lizum", name: "Axamer Lizum" }]}
      />,
    );
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Ausfahrt veröffentlichen" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "nicht gespeichert",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
