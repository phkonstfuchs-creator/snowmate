import { act, render, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PushAsk, { usePushAskAfterJoin } from "./PushAsk";

vi.mock("./PushSettings", () => ({ default: () => <div>Push settings</div> }));
beforeEach(() => window.localStorage.clear());

it("offers again after navigating away before the sheet is shown", () => {
  const first = renderHook(() => usePushAskAfterJoin(true));
  act(() => first.result.current.offer());
  expect(first.result.current.pending).toBe(true);
  first.unmount();
  const next = renderHook(() => usePushAskAfterJoin(true));
  act(() => next.result.current.offer());
  expect(next.result.current.pending).toBe(true);
});

it("does not offer again once the sheet was actually shown", () => {
  const shown = render(<PushAsk onClose={() => {}} />);
  shown.unmount();
  const next = renderHook(() => usePushAskAfterJoin(true));
  act(() => next.result.current.offer());
  expect(next.result.current.pending).toBe(false);
});

it("never offers in the demo", () => {
  const demo = renderHook(() => usePushAskAfterJoin(false));
  act(() => demo.result.current.offer());
  expect(demo.result.current.pending).toBe(false);
});
