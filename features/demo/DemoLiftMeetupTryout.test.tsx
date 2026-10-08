import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DemoLiftMeetupTryout from "./DemoLiftMeetupTryout";

describe("DemoLiftMeetupTryout", () => {
  it("shows a clearly labeled, local-only sample without an account", () => {
    render(<DemoLiftMeetupTryout />);

    expect(screen.getByRole("heading", { name: "Try the lift meetup" })).toBeInTheDocument();
    expect(screen.getByText(/no account and no GPS/)).toBeInTheDocument();
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


it("embeds the compact sample without an extra outer card and retains safety and reset", () => {
  render(<DemoLiftMeetupTryout compact />);
  const section = screen.getByRole("region", { name: "Try the lift meetup" });
  expect(section).not.toHaveClass("mx-4", "mt-4", "p-4");
  expect(screen.getByText(/No account needed; no GPS, push notification, or saved data/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start sample" }));
  expect(screen.getByText(/Lena is estimated at Seegrube/)).toBeInTheDocument();
  expect(screen.getByText(/For you: take Seegrubenbahn/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset sample" }));
  expect(screen.getByRole("button", { name: "Start sample" })).toBeInTheDocument();
});
