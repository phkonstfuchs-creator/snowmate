import { describe, expect, it } from "vitest";
import { isNativeApp } from "./native-app";

describe("isNativeApp", () => {
  it("recognises the shell's marker only", () => {
    expect(isNativeApp("Mozilla/5.0 (iPhone) AppleWebKit/605 PistlApp/1.0 ios")).toBe(true);
    expect(isNativeApp("Mozilla/5.0 (iPhone) AppleWebKit/605 Safari/604")).toBe(false);
    expect(isNativeApp(null)).toBe(false);
  });
});
