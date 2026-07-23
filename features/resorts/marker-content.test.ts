import { describe, expect, it } from "vitest";

import { createMarkerContent } from "@/features/resorts/marker-content";
import type { ResortStatus } from "@/lib/types";

const resort: ResortStatus = {
  name: '<img src=x onerror="alert(1)">',
  city: "innsbruck",
  ridersNow: 12,
  chillRiders: 4,
  parkRiders: 3,
  offPisteRiders: 5,
  conditions: "fresh",
  liftsOpen: 9,
  totalLifts: 12,
  snowDepth: 180,
  altitudeMax: 3340,
  altitudeMin: 1400,
  mountainShape: 2,
};

describe("createMarkerContent", () => {
  it("renders external resort names as text instead of executable HTML", () => {
    const marker = createMarkerContent(resort, true, 50);

    expect(marker.querySelector("img")).toBeNull();
    expect(marker.textContent).toBe("12<img");
  });

  it("omits the name for compact markers", () => {
    const marker = createMarkerContent(resort, false, 36);

    expect(marker.textContent).toBe("12");
  });
});
