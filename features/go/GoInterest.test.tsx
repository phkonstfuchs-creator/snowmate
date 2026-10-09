import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import GoInterest from "./GoInterest";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  withdraw: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./actions", () => ({
  readGoStatus: m.read,
  saveGoInterest: m.save,
  withdrawGoInterest: m.withdraw,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: m.refresh }),
}));
const id = "00000000-0000-4000-8000-000000000001";
const wish = {
  id,
  rideId: id,
  minimumGroup: 3,
  needsCarpool: true,
  confirmedGroup: 1,
  hasConfirmedCarpool: false,
  groupReady: false,
  carpoolReady: false,
  ready: false,
  status: "interested" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.read.mockResolvedValue({ status: "ok", wish: null });
});
it("loading and unavailable keep normal join blocked", async () => {
  const gate = vi.fn();
  m.read.mockResolvedValue({ status: "unavailable" });
  render(
    <GoInterest
      rideId={id}
      totalSpots={3}
      isJoined={false}
      isPending={false}
      onGate={gate}
    />,
  );
  expect(gate).not.toHaveBeenCalledWith(false);
  await screen.findByRole("alert");
  expect(gate).toHaveBeenLastCalledWith(true);
});
it("stores a wish without joining and requires ready conditions", async () => {
  const gate = vi.fn();
  m.save.mockResolvedValue({ ok: true, message: "Saved" });
  m.read
    .mockResolvedValueOnce({ status: "ok", wish: null })
    .mockResolvedValue({ status: "ok", wish });
  render(
    <GoInterest
      rideId={id}
      totalSpots={3}
      isJoined={false}
      isPending={false}
      onGate={gate}
    />,
  );
  await screen.findByRole("button", { name: "Save wish" });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save wish" }));
  await waitFor(() => expect(m.save).toHaveBeenCalledWith(id, 3, true));
  await screen.findByRole("button", { name: "Withdraw wish" });
  expect(gate).toHaveBeenLastCalledWith(true);
});
it("a ready wish enables explicit normal join and withdrawal remains manual", async () => {
  const gate = vi.fn();
  m.read.mockResolvedValue({
    status: "ok",
    wish: {
      ...wish,
      ready: true,
      groupReady: true,
      carpoolReady: true,
      hasConfirmedCarpool: true,
      status: "ready",
    },
  });
  m.withdraw.mockResolvedValue({ ok: true, message: "Withdrawn" });
  render(
    <GoInterest
      rideId={id}
      totalSpots={3}
      isJoined={false}
      isPending={false}
      onGate={gate}
    />,
  );
  await screen.findByText("Conditions met. Join explicitly below.");
  expect(gate).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole("button", { name: "Withdraw wish" }));
  await waitFor(() => expect(m.withdraw).toHaveBeenCalledWith(id));
});
it("shows confirmed condition loss while preserving leave action", async () => {
  const gate = vi.fn();
  m.read.mockResolvedValue({
    status: "ok",
    wish: { ...wish, status: "confirmed" },
  });
  render(
    <GoInterest
      rideId={id}
      totalSpots={3}
      isJoined
      isPending={false}
      onGate={gate}
    />,
  );
  await screen.findByText(
    "Conditions changed after you joined. Your participation remains confirmed.",
  );
  expect(gate).toHaveBeenLastCalledWith(false);
  expect(screen.queryByRole("button", { name: "Save wish" })).toBeNull();
});

it("withdrawn wishes unlock ordinary join again", async () => {
  const gate = vi.fn();
  m.read.mockResolvedValue({
    status: "ok",
    wish: { ...wish, status: "withdrawn" },
  });
  render(
    <GoInterest
      rideId={id}
      totalSpots={3}
      isJoined={false}
      isPending={false}
      onGate={gate}
    />,
  );
  await screen.findByRole("button", { name: "Save wish" });
  expect(gate).toHaveBeenLastCalledWith(false);
});
it("never offers unsupported group sizes", async () => {
  render(
    <GoInterest
      rideId={id}
      totalSpots={50}
      isJoined={false}
      isPending={false}
      onGate={() => {}}
    />,
  );
  await screen.findByRole("button", { name: "Save wish" });
  expect(screen.getAllByRole("option")).toHaveLength(11);
});
