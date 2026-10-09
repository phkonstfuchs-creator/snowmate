import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DayPlanSheet from "./DayPlanSheet";

const actions = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn() }));

vi.mock("./actions", () => ({ saveDayPlan: actions.save, deleteDayPlan: actions.remove }));

const plan = {
  id: "plan-1",
  version: 3,
  city: "innsbruck" as const,
  resort: "Axamer Lizum",
  planDate: "2026-10-12",
  meetTime: "09:30",
  transport: "need" as const,
  meetingText: "At the main entrance",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  expiresAt: "2026-10-14T22:00:00.000Z",
};

describe("DayPlanSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-plan-id");
  });

  it("collects a private day plan and sends the client id with the save", async () => {
    actions.save.mockResolvedValue({ ok: true, message: "dayPlan.saved", plan });
    const onSaved = vi.fn();
    render(<DayPlanSheet city="innsbruck" onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText(/resort/i), { target: { value: "Axamer Lizum" } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByLabelText(/i need a lift|need transport|need a ride/i));
    expect(screen.getByText(/doesn.t reserve a seat/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/meeting point/i), { target: { value: "At the main entrance" } });
    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => expect(actions.save).toHaveBeenCalledWith("new-plan-id", 0, {
      city: "innsbruck",
      resort: "Axamer Lizum",
      planDate: "2026-10-12",
      meetTime: "09:30",
      transport: "need",
      meetingText: "At the main entrance",
    }));
    expect(onSaved).toHaveBeenCalledWith(plan);
  });

  it("keeps entered data and does not report success when a save fails", async () => {
    actions.save.mockResolvedValue({ ok: false, message: "common.unavailable" });
    const onSaved = vi.fn();
    render(<DayPlanSheet city="innsbruck" onClose={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/resort/i), { target: { value: "Axamer Lizum" } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/i have my own transport|own transport/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/meeting point/i), { target: { value: "At the main entrance" } });

    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    expect(screen.getByLabelText(/meeting point/i)).toHaveValue("At the main entrance");
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not make server requests for a visibly local demo plan", async () => {
    const onSaved = vi.fn();
    render(<DayPlanSheet city="innsbruck" demo onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByText(/demo|local/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/resort/i), { target: { value: "Axamer Lizum" } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/i have my own transport|own transport/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/meeting point/i), { target: { value: "At the main entrance" } });
    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    expect(actions.save).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String), resort: "Axamer Lizum" }));
  });

  it("requires an in-sheet confirmation before deleting an existing plan", async () => {
    actions.remove.mockResolvedValue({ ok: true, message: "dayPlan.deleted" });
    const onClose = vi.fn();
    render(<DayPlanSheet city="innsbruck" initial={plan} onClose={onClose} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /delete plan/i }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/delete this plan/i)).toBeInTheDocument();
    expect(actions.remove).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith("plan-1", 3));
    expect(onClose).toHaveBeenCalled();
  });
});
