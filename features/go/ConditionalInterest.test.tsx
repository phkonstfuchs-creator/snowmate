import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ConditionalInterest from "./ConditionalInterest";
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  withdraw: vi.fn(),
  request: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./actions", () => ({
  setGoInterestAction: mocks.save,
  withdrawGoInterestAction: mocks.withdraw,
}));
vi.mock("@/features/rides/actions", () => ({
  requestRideAction: mocks.request,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
const row = {
  id: "10000000-0000-4000-8000-000000000001",
  rideId: "10000000-0000-4000-8000-000000000002",
  minimumGroup: 2,
  needsCarpool: true,
  confirmedGroup: 1,
  hasConfirmedCarpool: false,
  groupReady: false,
  carpoolReady: false,
  ready: false,
  status: "interested" as const,
};
const props = {
  rideId: row.rideId,
  capacity: 4,
  result: { status: "ready" as const, data: row },
  editable: true,
  canRequest: true,
  carpoolHref: "/carpool?resort=stubai-glacier",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue({ ok: true, id: row.id });
  mocks.withdraw.mockResolvedValue({ ok: true, id: row.id });
  mocks.request.mockResolvedValue({ ok: true, id: row.id });
});
it("explains unmet conditions without offering automatic booking", () => {
  render(<ConditionalInterest {...props} />);
  expect(
    screen.getByText(/1 bereits bestätigt · Mindestgruppe 2 inklusive dir/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Deine eigene Zusage zählt zur Mindestgruppe/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Noch kein bestätigter Mitfahrplatz/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Teilnahme anfragen" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Mitfahrt organisieren" }),
  ).toHaveAttribute("href", props.carpoolHref);
});
it("saves validated own conditions and refreshes", async () => {
  render(
    <ConditionalInterest {...props} result={{ status: "ready", data: null }} />,
  );
  fireEvent.change(
    screen.getByRole("combobox", {
      name: "Mindestgruppe inklusive dir und Gastgeber",
    }),
    { target: { value: "3" } },
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Ich brauche einen bestätigten Mitfahrplatz",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Bedingungen speichern" }),
  );
  await waitFor(() =>
    expect(mocks.save).toHaveBeenCalledWith({
      rideId: row.rideId,
      minimumGroup: 3,
      needsCarpool: true,
      idempotencyKey: expect.any(String),
    }),
  );
  expect(mocks.refresh).toHaveBeenCalled();
});
it("requires explicit request even after conditions are ready", async () => {
  render(
    <ConditionalInterest
      {...props}
      result={{
        status: "ready",
        data: {
          ...row,
          groupReady: true,
          carpoolReady: true,
          ready: true,
          status: "ready",
        },
      }}
    />,
  );
  expect(mocks.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Teilnahme anfragen" }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Anfrage gespeichert",
  );
});
it("withdraws interest without leaving a confirmed ride", async () => {
  render(<ConditionalInterest {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Bedingungen zurückziehen" }),
  );
  await waitFor(() => expect(mocks.withdraw).toHaveBeenCalled());
});
it("fails closed on unavailable state and disables expired/confirmed edits", () => {
  const { rerender } = render(
    <ConditionalInterest {...props} result={{ status: "unavailable" }} />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(
    <ConditionalInterest
      {...props}
      editable={false}
      result={{ status: "ready", data: { ...row, status: "confirmed" } }}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByText(/Teilnahme bestätigt/)).toBeInTheDocument();
});
it("keeps the command identity on retry and catches connection errors", async () => {
  mocks.save
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ ok: false, message: "Bitte warten" });
  render(<ConditionalInterest {...props} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Bedingungen speichern" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("erneut");
  fireEvent.click(
    screen.getByRole("button", { name: "Bedingungen speichern" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Bitte warten");
  const firstInput = mocks.save.mock.calls.at(0)?.at(0);
  const retryInput = mocks.save.mock.calls.at(1)?.at(0);
  expect(firstInput?.idempotencyKey).toEqual(expect.any(String));
  expect(retryInput?.idempotencyKey).toEqual(firstInput?.idempotencyKey);
});

it("shows a lost condition after confirmation and an expired interest", () => {
  const { rerender } = render(
    <ConditionalInterest
      {...props}
      editable={false}
      result={{ status: "ready", data: { ...row, status: "confirmed" } }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Eine Bedingung ist wieder offen",
  );
  rerender(
    <ConditionalInterest
      {...props}
      result={{ status: "ready", data: { ...row, status: "expired" } }}
    />,
  );
  expect(
    screen.getByText("Dein Interesse ist abgelaufen."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("does not submit twice while a command is pending", async () => {
  let resolve!: (value: { ok: true; id: string }) => void;
  mocks.save.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<ConditionalInterest {...props} />);
  const button = screen.getByRole("button", { name: "Bedingungen speichern" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  resolve({ ok: true, id: row.id });
  await waitFor(() => expect(button).not.toBeDisabled());
});
