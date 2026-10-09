import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CarpoolActions from "./CarpoolActions";
const { request, leave, respond, cancel, refresh } = vi.hoisted(() => ({
  request: vi.fn(),
  leave: vi.fn(),
  respond: vi.fn(),
  cancel: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./actions", () => ({
  requestCarpoolAction: request,
  leaveCarpoolAction: leave,
  respondCarpoolRequestAction: respond,
  cancelCarpoolAction: cancel,
}));
beforeEach(() => {
  vi.clearAllMocks();
  request.mockResolvedValue({ ok: true, id: "id" });
});
it("requests a seat without inventing confirmed membership", async () => {
  render(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={2}
      isHost={false}
      isMember={false}
      status="scheduled"
      requests={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Platz anfragen" }));
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Anfrage gespeichert",
  );
  expect(screen.queryByText("Platz bestätigt")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});
it("keeps failed commands visible and permits retry", async () => {
  request.mockResolvedValue({ ok: false, message: "Keine Verbindung" });
  render(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={2}
      isHost={false}
      isMember={false}
      status="scheduled"
      requests={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Platz anfragen" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Keine Verbindung",
  );
  expect(refresh).not.toHaveBeenCalled();
});
it("offers leave for a confirmed member and blocks full rides", () => {
  const { rerender } = render(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={0}
      isHost={false}
      isMember={false}
      status="scheduled"
      requests={[]}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Keine Plätze frei" }),
  ).toBeDisabled();
  rerender(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={0}
      isHost={false}
      isMember={true}
      status="scheduled"
      requests={[]}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Mitfahrt verlassen" }),
  ).toBeEnabled();
});
it("withdraws a pending request without claiming a confirmed seat", async () => {
  leave.mockResolvedValue({ ok: true, id: "id" });
  render(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={2}
      isHost={false}
      isMember={false}
      status="scheduled"
      requests={[
        {
          id: "request",
          carpoolId: "id",
          requester: {
            id: "user",
            displayName: "Mia",
            handle: "mia",
            avatarPath: null,
          },
          status: "pending",
          createdAt: "2030-01-01",
          respondedAt: null,
        },
      ]}
    />,
  );
  expect(
    screen.getByText("Anfrage offen · noch keine Bestätigung"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Anfrage zurückziehen" }));
  await waitFor(() => expect(leave).toHaveBeenCalled());
});
it("lets the host confirm real pending requests", async () => {
  respond.mockResolvedValue({ ok: true, id: "id" });
  render(
    <CarpoolActions
      carpoolId="id"
      role="driver"
      availableSeats={2}
      isHost
      isMember={false}
      status="scheduled"
      requests={[
        {
          id: "request",
          carpoolId: "id",
          requester: {
            id: "user",
            displayName: "Mia",
            handle: "mia",
            avatarPath: null,
          },
          status: "pending",
          createdAt: "2030-01-01",
          respondedAt: null,
        },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Annehmen" }));
  await waitFor(() =>
    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request", accept: true }),
    ),
  );
});
it("preserves the request key across a failed retry", async () => {
  request.mockResolvedValue({ ok: false, message: "Offline" });
  render(
    <CarpoolActions
      carpoolId="id"
      role="rider"
      availableSeats={1}
      isHost={false}
      isMember={false}
      status="scheduled"
      requests={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Fahrt anbieten" }));
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Fahrt anbieten" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Fahrt anbieten" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(request.mock.calls[0]?.[0].idempotencyKey).toBe(
    request.mock.calls[1]?.[0].idempotencyKey,
  );
});
