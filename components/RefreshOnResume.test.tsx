import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RefreshOnResume from "./RefreshOnResume";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("RefreshOnResume", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("refreshes when the app comes back after a while, not after a glance away", () => {
    render(<RefreshOnResume />);
    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(3_000));
    setVisibility("visible");
    expect(refresh).not.toHaveBeenCalled();

    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(30_000));
    setVisibility("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes every five minutes while visible, never while hidden", () => {
    render(<RefreshOnResume />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(4 * 60_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
