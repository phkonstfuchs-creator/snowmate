import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareImageUpload } from "./safe-upload";

describe("prepareImageUpload", () => {
  it("decodes and re-encodes a photo without its EXIF metadata", async () => {
    const source = await sharp({ create: { width: 20, height: 10, channels: 3, background: "white" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "private-test-marker" } })
      .toBuffer();
    expect((await sharp(source).metadata()).exif).toBeDefined();

    const result = await prepareImageUpload(new Uint8Array(source), { maxSide: 512, maxBytes: 512 * 1024, square: true });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.type).toBe("image/webp");
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.width).toBe(metadata.height);
  });

  it("refuses a tiny compressed image with excessive decoded pixels", async () => {
    const source = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "white" } })
      .jpeg({ quality: 1 })
      .toBuffer();
    expect(source.length).toBeLessThan(512 * 1024);
    await expect(prepareImageUpload(new Uint8Array(source), { maxSide: 512, maxBytes: 512 * 1024, square: true }))
      .resolves.toEqual({ status: "invalid" });
  });

  it("refuses an image with only a valid-looking header", async () => {
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0, 1, 2]);
    await expect(prepareImageUpload(truncated, { maxSide: 1600, maxBytes: 1536 * 1024, square: false }))
      .resolves.toEqual({ status: "invalid" });
  });
});
