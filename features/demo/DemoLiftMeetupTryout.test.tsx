import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DemoLiftMeetupTryout from "./DemoLiftMeetupTryout";

describe("DemoLiftMeetupTryout", () => {
  it("shows a clearly labeled, local-only sample without an account", () => {
    render(<DemoLiftMeetupTryout />);

    expect(screen.getByRole("heading", { name: "Try the lift meetup" })).toBeInTheDocument();
    expect(screen.getByText(/No account needed; no GPS, push notification, or saved data/)).toBeInTheDocument();
    expect(screen.queryByText(/Lena is estimated/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start sample" }));
    expect(screen.getByText(/Sample position: Seegrubenbahn valley station/)).toBeInTheDocument();
    expect(screen.getByText(/Lena is estimated at Seegrube/)).toBeInTheDocument();
    expect(screen.getByText(/For you: take Seegrubenbahn/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset sample" }));
    expect(screen.queryByText(/Lena is estimated/)).not.toBeInTheDocument();
  });
});
