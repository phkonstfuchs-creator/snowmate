import sharp from "sharp";
import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GET as avatar } from "../../app/avatar/[id]/route";
import { GET as postPhoto } from "../../app/post-photo/[id]/route";

const mocks = vi.hoisted(() => ({ avatar: vi.fn(), postPhoto: vi.fn() }));
vi.mock("@/features/profile/queries", () => ({ getVisibleAvatar: mocks.avatar }));
vi.mock("@/features/posts/queries", () => ({ getVisiblePostPhoto: mocks.postPhoto }));

let oldJpeg: NodeBlob;
beforeAll(async () => {
  const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } })
    .jpeg().withExif({ IFD0: { Copyright: "private-test-marker" } }).toBuffer();
  expect((await sharp(bytes).metadata()).exif).toBeDefined();
  oldJpeg = new NodeBlob([bytes], { type: "image/jpeg" });
});

const context = { params: Promise.resolve({ id: "c4a70000-0000-4000-8000-000000000001" }) };

describe.each([
  ["avatar", avatar, () => mocks.avatar],
  ["post photo", postPhoto, () => mocks.postPhoto],
] as const)("%s route", (_name, route, query) => {
  it("strips metadata from a historical JPEG before responding", async () => {
    query().mockResolvedValue(oldJpeg);
    const response = await route(new Request("https://example.test/image"), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("does not serve an invalid stored image", async () => {
    query().mockResolvedValue(new NodeBlob(["<svg onload=alert(1)>"]));
    const response = await route(new Request("https://example.test/image"), context);
    expect(response.status).toBe(404);
  });

  it("rejects an oversized stored object before reading it", async () => {
    const size = _name === "avatar" ? 512 * 1024 + 1 : 1536 * 1024 + 1;
    const stored = new NodeBlob([new Uint8Array(size)]);
    const read = vi.spyOn(stored, "arrayBuffer");
    query().mockResolvedValue(stored);
    const response = await route(new Request("https://example.test/image"), context);
    expect(response.status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });
});
