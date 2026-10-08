import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportBlockSheet from "./ReportBlockSheet";

const mocks = vi.hoisted(() => ({ block: vi.fn(), report: vi.fn(), refresh: vi.fn() }));
vi.mock("./actions", () => ({ blockUserAction: mocks.block, reportUserAction: mocks.report }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const target = { userId: "u1", name: "Max Rider", rideId: "r1" };

beforeEach(() => vi.clearAllMocks());

describe("ReportBlockSheet", () => {
  it("offers the dedicated abuse mailbox", () => {
    render(<ReportBlockSheet target={target} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Report Max Rider/ }));
    expect(screen.getByRole("link", { name: "meldung@pistl.app" })).toHaveAttribute("href", "mailto:meldung@pistl.app?subject=Pistl%20Meldung");
  });

  it("blocks after confirming", async () => {
    mocks.block.mockResolvedValue({ ok: true, message: "Blocked. You will not see each other anymore." });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ReportBlockSheet target={target} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Block Max Rider" }));
    expect(mocks.block).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Block Max Rider" }));
    });
    expect(mocks.block).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("status")).toHaveTextContent("Blocked");
    expect(mocks.refresh).toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("reports with a reason, details, the ride and a block", async () => {
    mocks.report.mockResolvedValue({ ok: true, message: "Thanks. We will look at it." });
    render(<ReportBlockSheet target={target} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /Report Max Rider/ }));
    const send = screen.getByRole("button", { name: "Send report" });
    expect(send).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "Harassment or bullying" }));
    fireEvent.change(screen.getByLabelText(/Details/), { target: { value: "Rude messages" } });
    await act(async () => {
      fireEvent.click(send);
    });

    expect(mocks.report).toHaveBeenCalledWith({
      userId: "u1",
      reason: "harassment",
      details: "Rude messages",
      alsoBlock: true,
      rideId: "r1",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Thanks");
  });

  it("passes the reported post along", async () => {
    mocks.report.mockResolvedValue({ ok: true, message: "Thanks. We will look at it." });
    render(<ReportBlockSheet target={{ userId: "u1", name: "Max", postId: "p1" }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Report Max/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Spam or selling" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    });
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ postId: "p1" }));
  });

  it("shows a refusal and does not refresh", async () => {
    mocks.report.mockResolvedValue({ ok: false, message: "You have sent many reports today. Try again tomorrow." });
    render(<ReportBlockSheet target={{ userId: "u1", name: "Max" }} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Report Max/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Spam or selling" }));
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    });
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ alsoBlock: false }));
    expect(screen.getByRole("status")).toHaveTextContent("many reports");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
