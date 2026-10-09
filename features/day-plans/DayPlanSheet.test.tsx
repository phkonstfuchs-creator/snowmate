import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-plan-id");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    expect(screen.getByText(/no seat is reserved/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/meeting point/i), { target: { value: "At the main entrance" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /save.*plan/i })));

    expect(actions.save).toHaveBeenCalledWith("new-plan-id", 0, {
      city: "innsbruck",
      resort: "Axamer Lizum",
      planDate: "2026-10-12",
      meetTime: "09:30",
      transport: "need",
      meetingText: "At the main entrance",
    });
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

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /save.*plan/i })));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    expect(screen.getByLabelText(/meeting point/i)).toHaveValue("At the main entrance");
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("turns a stale edit into a visible read-only state", async () => {
    actions.save.mockResolvedValue({ ok: false, message: "dayPlan.conflict" });
    render(<DayPlanSheet city="innsbruck" initial={plan} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/i need a lift|need transport|need a ride/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /save.*plan/i })));

    expect(screen.getByRole("alert")).toHaveTextContent(/changed elsewhere/i);
    expect(screen.getByRole("status")).toHaveTextContent(/editing is paused/i);
    expect(screen.getByRole("button", { name: /save.*plan/i })).toBeDisabled();
    expect(screen.getByLabelText(/meeting point/i)).toBeDisabled();
  });

  it("lets a retained yesterday plan be viewed in all steps without editing or saving it", async () => {
    const yesterday = { ...plan, planDate: "2026-10-08", expiresAt: "2026-10-11T22:00:00.000Z" };
    render(<DayPlanSheet city="innsbruck" initial={yesterday} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/date/i)).toHaveValue("2026-10-08");
    expect(screen.getByLabelText(/date/i)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("heading", { name: /how are you getting there/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/i need a lift|need transport|need a ride/i)).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByLabelText(/meeting point/i)).toHaveValue("At the main entrance");
    expect(screen.getByLabelText(/meeting point/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /save.*plan/i })).toBeDisabled();
    expect(screen.getByRole("note")).toHaveTextContent(/past day is read-only/i);
  });

  it("closes an expired plan on focus and never offers deletion for it", async () => {
    const onClose = vi.fn();
    const expired = { ...plan, expiresAt: "2026-10-09T09:59:59.000Z" };
    render(<DayPlanSheet city="innsbruck" initial={expired} onClose={onClose} onSaved={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await act(async () => fireEvent.focus(window));
    expect(onClose).toHaveBeenCalledOnce();
    expect(actions.remove).not.toHaveBeenCalled();
  });

  it("does not report a save that finishes after the plan expiry", async () => {
    let resolveSave!: (value: { ok: true; message: string; plan: typeof plan }) => void;
    actions.save.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const shortLived = { ...plan, expiresAt: "2026-10-09T10:00:05.000Z" };
    render(<DayPlanSheet city="innsbruck" initial={shortLived} onClose={onClose} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /save.*plan/i })));
    expect(actions.save).toHaveBeenCalledOnce();

    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    resolveSave({ ok: true, message: "dayPlan.saved", plan });
    await act(async () => Promise.resolve());

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends only one request when save is tapped repeatedly", async () => {
    actions.save.mockResolvedValue({ ok: true, message: "dayPlan.saved", plan });
    render(<DayPlanSheet city="innsbruck" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/resort/i), { target: { value: "Axamer Lizum" } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: "09:30" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByLabelText(/i have my own transport|own transport/i));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.change(screen.getByLabelText(/meeting point/i), { target: { value: "At the main entrance" } });

    await act(async () => {
      const save = screen.getByRole("button", { name: /save.*plan/i });
      fireEvent.click(save);
      fireEvent.click(save);
      await Promise.resolve();
    });

    expect(actions.save).toHaveBeenCalledTimes(1);
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
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /save.*plan/i })));

    expect(actions.save).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String), resort: "Axamer Lizum" }));
  });

  it("requires an in-sheet confirmation before deleting an existing plan", async () => {
    actions.remove.mockResolvedValue({ ok: true, message: "dayPlan.deleted" });
    const onClose = vi.fn();
    render(<DayPlanSheet city="innsbruck" initial={plan} onClose={onClose} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /delete plan/i }));
    const dialog = screen.getByRole("group", { name: /delete this plan/i });
    expect(within(dialog).getByText(/delete this plan/i)).toBeInTheDocument();
    expect(actions.remove).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: /confirm delete/i })));

    expect(actions.remove).toHaveBeenCalledWith("plan-1", 3);
    await act(async () => vi.advanceTimersByTimeAsync(160));
    expect(onClose).toHaveBeenCalled();
  });
});
