import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RideCommandButton from "./RideCommandButton";
import RideMeetingPoint from "./RideMeetingPoint";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
describe("persistent ride controls", () => {
  it("never exposes a masked meeting point", () => {
    render(
      <RideMeetingPoint canViewExact={false} meetingPoint="Secret place" />,
    );
    expect(screen.queryByText("Secret place")).not.toBeInTheDocument();
    expect(screen.getByText(/Nach Bestätigung/)).toBeInTheDocument();
  });
  it("shows the permitted meeting point", () => {
    render(<RideMeetingPoint canViewExact meetingPoint="Talstation" />);
    expect(screen.getByText("Talstation")).toBeInTheDocument();
  });
  it("reports rejected writes and keeps the retry key stable", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Keine Plätze frei." });
    render(
      <RideCommandButton
        action={action}
        input={{ rideId: "abc" }}
        label="Anfragen"
        success="Angefragt"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Anfragen" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent("Keine Plätze frei.");
    fireEvent.click(screen.getByRole("button", { name: "Anfragen" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action.mock.calls[0]?.[0].idempotencyKey).toBe(
      action.mock.calls[1]?.[0].idempotencyKey,
    );
  });
  it("confirms only a successful persisted action", async () => {
    render(
      <RideCommandButton
        action={vi.fn().mockResolvedValue({ ok: true, id: "abc" })}
        input={{ rideId: "abc" }}
        label="Anfragen"
        success="Anfrage gesendet"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Anfragen" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Anfrage gesendet",
    );
  });
});
