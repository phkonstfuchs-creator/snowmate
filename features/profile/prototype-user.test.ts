import { describe, expect, it } from "vitest";
import { ME } from "@/lib/data";
import { createPrototypeCurrentUser } from "./prototype-user";

describe("createPrototypeCurrentUser", () => {
  it("keeps prototype stats while replacing every real identity field", () => {
    const currentUser = createPrototypeCurrentUser(
      {
        displayName: "Philipp Fuchs",
        handle: "philipp_f",
        city: "salzburg",
        abilityLevel: "park",
      },
      ME,
    );

    expect(currentUser).not.toBe(ME);
    expect(currentUser).toMatchObject({
      id: "me",
      name: "Philipp Fuchs",
      handle: "philipp_f",
      avatar: "PF",
      city: "salzburg",
      xp: ME.xp,
    });
    expect(ME.name).not.toBe("Philipp Fuchs");
  });
});
