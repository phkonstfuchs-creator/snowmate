import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
const safePath = runInNewContext(`${source}\nsafePath`, {
  self: { addEventListener() {} },
}) as (value: unknown) => string;

describe("push notification click target", () => {
  it("opens an internal page and rejects protocol-relative external URLs", () => {
    expect(safePath("/map")).toBe("/map");
    expect(safePath("/crew/chat/abc")).toBe("/crew/chat/abc");
    expect(safePath("//evil")).toBe("/feed");
    expect(safePath("/\\evil")).toBe("/feed");
    expect(safePath("/%2Fevil")).toBe("/feed");
  });
});
