import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterServiceWorker from "./RegisterServiceWorker";

const register = vi.fn().mockResolvedValue({});

describe("RegisterServiceWorker", () => {
  afterEach(() => {
    register.mockClear();
    vi.unstubAllGlobals();
  });

  it("registers the worker in a browser, for the offline page", async () => {
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    render(<RegisterServiceWorker />);
    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" }));
  });

  it("leaves the store apps alone, whose shell has its own offline page", async () => {
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 PistlApp/1.0");
    render(<RegisterServiceWorker />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(register).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
