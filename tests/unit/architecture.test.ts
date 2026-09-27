// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/* Guards the guards: each architecture rule must keep rejecting a
   deliberate violation. If one of these starts passing, a rule in
   eslint.config.mjs was weakened. See docs/ARCHITECTURE.md. */

const eslint = new ESLint({ cwd: process.cwd() });

async function violations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${code}\nexport const probe = 1;\n`, { filePath });
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === "no-restricted-imports")
    .map((message) => message.message);
}

describe("architecture rules", () => {
  it.each([
    ["a component importing a route", "features/rides/FeedScreen.tsx", 'import Page from "@/app/(app)/feed/page";', "Routes are entry points"],
    ["a signed-in route reading fixtures", "app/(app)/feed/page.tsx", 'import { ME } from "@/lib/data";', "must not read prototype fixtures"],
    ["a query reading fixtures", "features/rides/queries.ts", 'import { ME } from "../../lib/data";', "must not read prototype fixtures"],
    ["a query importing a client hook", "features/rides/queries.ts", 'import { useRideBoard } from "./useRideBoard";', "Hooks belong to the client"],
    ["an action rendering UI", "features/rides/actions.ts", 'import RideCard from "@/components/feed/RideCard";', "returns data, not UI"],
    ["a business rule importing React", "features/rides/capacity.ts", 'import { useState } from "react";', "independent of UI and framework"],
    ["a business rule querying the database", "features/rides/visibility.ts", 'import { createClient } from "@/lib/supabase/server";', "do not talk to the database"],
    ["a business rule importing a screen", "features/profile/account-stats.ts", 'import type { X } from "./ProfileScreen";', "must not depend on UI components"],
  ])("rejects %s", async (_label, filePath, code, expected) => {
    const messages = await violations(filePath, code);
    expect(messages.join("\n")).toContain(expected);
    expect(messages.join("\n")).toContain("docs/ARCHITECTURE.md");
  }, 30_000);

  it("allows the demo to use fixtures and screens to use hooks", async () => {
    await expect(violations("app/demo/feed/page.tsx", 'import { ME } from "@/lib/data";')).resolves.toEqual([]);
    await expect(violations("features/rides/FeedScreen.tsx", 'import { useRideBoard } from "./useRideBoard";')).resolves.toEqual([]);
  }, 30_000);
});
