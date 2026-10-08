import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupFlow from "./SignupFlow";

const mocks = vi.hoisted(() => ({
  signUpAction: vi.fn(),
  checkHandleAction: vi.fn(),
  push: vi.fn(),
}));

vi.mock("./actions", () => ({ signUpAction: mocks.signUpAction, checkHandleAction: mocks.checkHandleAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, refresh: vi.fn() }) }));

async function toAccountStep() {
  fireEvent.click(screen.getByRole("button", { name: /Innsbruck/ }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  fireEvent.click(screen.getByRole("button", { name: /Park/ }));
  fireEvent.click(screen.getByRole("button", { name: /Chill/ }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.change(screen.getByPlaceholderText("Alex Rider"), { target: { value: "Lena Moser" } });
  fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "2008-01-02" } });
  await waitFor(() => expect(screen.getByText("Available")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("SignupFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkHandleAction.mockResolvedValue("available");
  });

  it("explains a greyed-out Next and stops under 14 right on the profile step", async () => {
    render(<SignupFlow startAtTitle={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Innsbruck/ }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    fireEvent.click(screen.getByRole("button", { name: /Chill/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByPlaceholderText("Alex Rider"), { target: { value: "Lena Moser" } });
    await waitFor(() => expect(screen.getByText("Available")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("Add your birth date to continue.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "2016-01-02" } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("Pistl is for riders aged 14 and over.")).toBeInTheDocument();
  });

  it("starts with the cover and moves to the region", () => {
    render(<SignupFlow />);
    expect(screen.getByRole("heading", { name: "Find your crew" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByRole("heading", { name: "Where do you ride?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "I already have an account" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I already have an account" }));
    expect(mocks.push).toHaveBeenCalledWith("/login");
  });

  it("lets a rider pick several styles and needs at least one", async () => {
    render(<SignupFlow startAtTitle={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Salzburg/ }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Powder & freeride/ }));
    fireEvent.click(screen.getByRole("button", { name: /Chill/ }));
    expect(screen.getByRole("button", { name: /Powder & freeride/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Chill/ }));
    expect(screen.getByRole("button", { name: /Chill/ })).toHaveAttribute("aria-pressed", "false");
    expect(next).toBeEnabled();
  });

  it("checks the handle while typing and blocks a taken one", async () => {
    mocks.checkHandleAction.mockResolvedValue("taken");
    render(<SignupFlow startAtTitle={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Innsbruck/ }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    fireEvent.click(screen.getByRole("button", { name: /Park/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByPlaceholderText("Alex Rider"), { target: { value: "Max" } });
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "Max!" } });
    expect(screen.getByLabelText("Handle")).toHaveValue("max");
    fireEvent.change(screen.getByLabelText("Birth date"), { target: { value: "2008-01-02" } });
    await waitFor(() => expect(screen.getByText("That handle is taken.")).toBeInTheDocument());
    expect(mocks.checkHandleAction).toHaveBeenCalledWith("max");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "ab" } });
    expect(screen.getByText("Handles are 3 to 20 letters, numbers or underscores.")).toBeInTheDocument();
  });

  /* On success the server redirects to the code screen. */
  it("sends every answer with the account", async () => {
    mocks.signUpAction.mockResolvedValue({ status: "idle", message: "" });
    render(<SignupFlow startAtTitle={false} />);
    await toAccountStep();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "lena@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Fresh-Powder-2026" } });
    expect(screen.getByText(/Strength/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "terms of use" })).toHaveAttribute("href", "/nutzungsbedingungen");
    fireEvent.click(screen.getByRole("checkbox", { name: /I accept the terms of use/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(mocks.signUpAction).toHaveBeenCalled());
    const sent = mocks.signUpAction.mock.calls[0]?.[1] as FormData;
    expect(sent.get("city")).toBe("innsbruck");
    expect(sent.getAll("ridingStyles")).toEqual(["park", "chill"]);
    expect(sent.get("displayName")).toBe("Lena Moser");
    expect(sent.get("handle")).toBe("lena_moser");
    expect(sent.get("birthDate")).toBe("2008-01-02");
    expect(sent.get("acceptTerms")).toBe("2026-10-07");
  });

  it("keeps consent checked after a server error and gives its label a 44px target", async () => {
    mocks.signUpAction.mockResolvedValue({ status: "error", message: "Try again." });
    render(<SignupFlow startAtTitle={false} />);
    await toAccountStep();
    const box = screen.getByRole("checkbox", { name: /I accept the terms of use/ });
    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again.");
    expect(box).toBeChecked();
    expect(box.closest("label")).toHaveClass("min-h-11");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.signUpAction).toHaveBeenCalledTimes(2));
    expect((mocks.signUpAction.mock.calls[1]?.[1] as FormData).get("acceptTerms")).toBe("2026-10-07");
  });

  it("keeps consent when a profile error sends the rider back and they retry", async () => {
    mocks.signUpAction.mockResolvedValueOnce({ status: "error", message: "Check the highlighted fields.", profileErrors: { handle: "That handle is taken." } }).mockResolvedValue({ status: "error", message: "Try again." });
    render(<SignupFlow startAtTitle={false} />);
    await toAccountStep();
    fireEvent.click(screen.getByRole("checkbox", { name: /I accept the terms of use/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("That handle is taken.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "lena_new" } });
    await waitFor(() => expect(mocks.checkHandleAction).toHaveBeenCalledWith("lena_new"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("checkbox", { name: /I accept the terms of use/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.signUpAction).toHaveBeenCalledTimes(2));
    expect((mocks.signUpAction.mock.calls[1]?.[1] as FormData).get("acceptTerms")).toBe("2026-10-07");
  });

  it("goes back to the step with the problem the server found", async () => {
    mocks.signUpAction.mockResolvedValue({
      status: "error",
      message: "Check the highlighted fields.",
      profileErrors: { handle: "That handle is taken." },
    });
    render(<SignupFlow startAtTitle={false} />);
    await toAccountStep();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "What is your name?" })).toBeInTheDocument());
    /* The step changes before the action state lands; wait for the message. */
    expect(await screen.findByText("That handle is taken.")).toBeInTheDocument();
  });
});
