import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StatusScreen from "./StatusScreen";

describe("StatusScreen", () => {
  it("offers one way home for a missing page", () => {
    render(<StatusScreen title="status.notFoundTitle" text="status.notFoundText" />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to start" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets a crash be retried", () => {
    const retry = vi.fn();
    render(<StatusScreen title="status.errorTitle" text="status.errorText" onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });
});
