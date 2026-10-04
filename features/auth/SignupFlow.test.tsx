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
    fireEvent.click(screen.getByRole("button", { name: /Off-piste/ }));
    fireEvent.click(screen.getByRole("button", { name: /Chill/ }));
    expect(screen.getByRole("button", { name: /Off-piste/ })).toHaveAttribute("aria-pressed", "true");
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

  it("sends every answer with the account and shows the confirmation", async () => {
    mocks.signUpAction.mockResolvedValue({ status: "success", message: "Check your email.", email: "lena@example.com" });
    render(<SignupFlow startAtTitle={false} />);
    await toAccountStep();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "lena@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Fresh-Powder-2026" } });
    expect(screen.getByText(/Strength/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Fresh-Powder-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("Check your email.")).toBeInTheDocument());
    const sent = mocks.signUpAction.mock.calls[0]?.[1] as FormData;
    expect(sent.get("city")).toBe("innsbruck");
    expect(sent.getAll("ridingStyles")).toEqual(["park", "chill"]);
    expect(sent.get("displayName")).toBe("Lena Moser");
    expect(sent.get("handle")).toBe("lena_moser");
    expect(sent.get("birthDate")).toBe("2008-01-02");
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
    expect(screen.getByText("That handle is taken.")).toBeInTheDocument();
  });
});
