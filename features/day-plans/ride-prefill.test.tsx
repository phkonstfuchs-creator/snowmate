import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PostRideModal from "@/components/feed/PostRideModal";
import { toIsoDay } from "@/features/rides/live-ride";

it("prefills the private plan without publishing or choosing a riding style", () => {
  const onPost = vi.fn();
  const planDate = toIsoDay(new Date(Date.now() + 36 * 60 * 60 * 1000));
  render(<PostRideModal city="innsbruck" mayGoPublic={false} onClose={vi.fn()} onPost={onPost}
    initialValues={{ resort: "Nordkette", rideDate: planDate, meetTime: "12:30", meetPoint: "Seegrube" }} />);
  expect(screen.getByRole("combobox", { name: "Resort" })).toHaveValue("Nordkette");
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(onPost).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /Park/ }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("Day")).toHaveValue(planDate);
  expect(screen.getByLabelText("Time")).toHaveValue("12:30");
  expect(screen.getByLabelText("Meeting point")).toHaveValue("Seegrube");
  expect(screen.getByRole("button", { name: /Public/ })).toBeDisabled();
  expect(onPost).not.toHaveBeenCalled();
});
