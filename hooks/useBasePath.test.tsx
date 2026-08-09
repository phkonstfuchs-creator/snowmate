import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBasePath } from "./useBasePath";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname }));

describe("useBasePath", () => {
  it.each(["/demo", "/demo/events", "/demo/people"])(
    "keeps %s inside the prototype",
    (pathname) => {
      usePathname.mockReturnValue(pathname);
      expect(renderHook(() => useBasePath()).result.current).toBe("/demo");
    },
  );

  it.each(["/feed", "/events", "/people", "/"])(
    "uses no prefix for the real route %s",
    (pathname) => {
      usePathname.mockReturnValue(pathname);
      expect(renderHook(() => useBasePath()).result.current).toBe("");
    },
  );

  /* Ohne die exakte Praefix-Pruefung wuerde eine spaetere Route wie
     /demonstration faelschlich als Prototyp gelten. */
  it("does not treat a route that merely starts with the same letters as the prototype", () => {
    usePathname.mockReturnValue("/demonstration");
    expect(renderHook(() => useBasePath()).result.current).toBe("");
  });
});
