import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CarpoolScreen from "./CarpoolScreen";
import { toLiveCarpool, type CarpoolRow } from "./live-carpool";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  withdraw: vi.fn(),
  respond: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("./actions", () => ({
  requestCarpoolAction: mocks.request,
  withdrawCarpoolRequestAction: mocks.withdraw,
  respondCarpoolRequestAction: mocks.respond,
  cancelCarpoolAction: mocks.cancel,
  createCarpoolAction: mocks.create,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const NOW = new Date(2027, 0, 8, 9);

function row(patch: Partial<CarpoolRow>): CarpoolRow {
  return {
    id: "c1",
    author_id: "a1",
    author_display_name: "Lena Moser",
    author_handle: "lena_m",
    role: "driver",
    resort: "Stubai Glacier",
    city: "innsbruck",
    ride_date: "2027-01-09",
    departure_point: null,
    departure_point_locked: true,
    departure_time: "07:30:00",
    seats: 2,
    seats_taken: 0,
    note: "Room for skis",
    created_at: "2027-01-08T07:00:00Z",
    is_author: false,
    my_request: null,
    requests: [],
    ...patch,
  };
}

const live = (rows: CarpoolRow[] | null) => ({
  carpools: rows ? rows.map((r) => toLiveCarpool(r, NOW)) : null,
  defaultCity: "innsbruck" as const,
});

describe("CarpoolScreen with real data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a locked pickup spot and requests a seat", async () => {
    mocks.request.mockResolvedValue({ ok: true, message: "Asked." });
    render(<CarpoolScreen live={live([row({})])} />);

    expect(screen.getByText("Pickup spot shared once you are confirmed")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Request seat" }));
    });
    expect(mocks.request).toHaveBeenCalledWith("c1");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("withdraws a pending request and offers a lift to a rider", async () => {
    mocks.withdraw.mockResolvedValue({ ok: true, message: "Request withdrawn." });
    mocks.request.mockResolvedValue({ ok: false, message: "This carpool is no longer available." });
    render(
      <CarpoolScreen
        live={live([row({ my_request: "pending" }), row({ id: "c2", role: "rider", seats: 2, author_display_name: "Max" })])}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Asked · tap to withdraw" }));
    });
    expect(mocks.withdraw).toHaveBeenCalledWith("c1");

    expect(screen.getByText("Needs 2 seats")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Offer a ride" }));
    });
    expect(mocks.request).toHaveBeenCalledWith("c2");
    expect(screen.getByText("This carpool is no longer available.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("This carpool is no longer available.")).not.toBeInTheDocument();
  });

  it("lets the author confirm, decline and remove", async () => {
    mocks.respond.mockResolvedValue({ ok: true, message: "Confirmed." });
    mocks.cancel.mockResolvedValue({ ok: true, message: "Carpool removed." });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CarpoolScreen
        live={live([
          row({
            is_author: true,
            departure_point: "Hbf",
            departure_point_locked: false,
            requests: [
              { user_id: "u1", display_name: "Max", handle: "max", status: "pending" },
              { user_id: "u2", display_name: "Jo", handle: "jo", status: "accepted" },
            ],
          }),
        ])}
      />,
    );

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("2 asked")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });
    expect(mocks.respond).toHaveBeenCalledWith("c1", "u1", true);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Decline Max" }));
    });
    expect(mocks.respond).toHaveBeenCalledWith("c1", "u1", false);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove post" }));
    });
    expect(mocks.cancel).toHaveBeenCalledWith("c1");
    confirm.mockRestore();
  });

  it("disables requests on a full car", () => {
    render(<CarpoolScreen live={live([row({ seats_taken: 2 })])} />);
    expect(screen.getByRole("button", { name: "Request seat" })).toBeDisabled();
  });

  it("posts an offer and reports errors", async () => {
    mocks.create.mockResolvedValueOnce({ ok: false, message: "That did not work. Try again shortly." });
    mocks.create.mockResolvedValueOnce({ ok: true, message: "Posted." });
    render(<CarpoolScreen live={live([])} />);

    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    const publish = screen.getByRole("button", { name: "Publish" });
    expect(publish).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Nordkette" } });
    fireEvent.change(screen.getByLabelText("Pickup spot"), { target: { value: "Innsbruck Hbf" } });
    fireEvent.change(screen.getByLabelText("Free seats"), { target: { value: "2" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("That did not work");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    });
    expect(mocks.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "driver", resort: "Nordkette", departurePoint: "Innsbruck Hbf", seats: 2, city: "innsbruck" }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("reports a load failure", () => {
    render(<CarpoolScreen live={live(null)} />);
    expect(screen.getByText(/Carpools could not be loaded/)).toBeInTheDocument();
    expect(screen.queryByText("No carpools yet")).not.toBeInTheDocument();
  });
});

describe("CarpoolScreen demo", () => {
  it("requests locally without calling the server", () => {
    render(<CarpoolScreen />);
    fireEvent.click(screen.getAllByRole("button", { name: "Request seat" })[0]!);
    expect(screen.getByRole("button", { name: "Asked · tap to withdraw" })).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Asked · tap to withdraw" }));
    expect(screen.queryByRole("button", { name: "Asked · tap to withdraw" })).not.toBeInTheDocument();
  });

  it("switches region and the rider role in the post sheet", () => {
    render(<CarpoolScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Salzburg" }));
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    fireEvent.click(screen.getByRole("button", { name: "I need a seat" }));
    expect(screen.getByLabelText("Seats needed")).toBeInTheDocument();
  });
});
