import { describe, expect, it } from "vitest";
import { isClosedTo, isFull, openSpots, totalOpenSpots } from "./capacity";

describe("capacity", () => {
  it("counts open spots and never goes negative", () => {
    expect(openSpots({ totalSpots: 4, takenSpots: 1 })).toBe(3);
    expect(openSpots({ totalSpots: 2, takenSpots: 5 })).toBe(0);
    expect(isFull({ totalSpots: 2, takenSpots: 2 })).toBe(true);
    expect(totalOpenSpots([{ totalSpots: 4, takenSpots: 1 }, { totalSpots: 2, takenSpots: 3 }])).toBe(3);
  });

  it("is only closed to people who are not in", () => {
    expect(isClosedTo({ totalSpots: 1, takenSpots: 1 }, false)).toBe(true);
    expect(isClosedTo({ totalSpots: 1, takenSpots: 1 }, true)).toBe(false);
  });
});
