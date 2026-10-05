import { describe, expect, it } from "vitest";
import { avatarPath, centerCrop, isOwnAvatarPath, sniffAvatarType } from "./avatar-image";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("profile picture rules", () => {
  it("recognises WebP and JPEG by their first bytes", () => {
    expect(sniffAvatarType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffAvatarType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("refuses anything else, whatever it is called", () => {
    expect(sniffAvatarType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull(); // PNG
    expect(sniffAvatarType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffAvatarType(bytes())).toBeNull();
  });

  it("stores pictures in the owner's folder under a fresh name", () => {
    expect(avatarPath("u-1", "image/webp", "abc")).toBe("u-1/abc.webp");
    expect(avatarPath("u-1", "image/jpeg", "abc")).toBe("u-1/abc.jpg");
    expect(isOwnAvatarPath("u-1", "u-1/abc.webp")).toBe(true);
    expect(isOwnAvatarPath("u-1", "u-2/abc.webp")).toBe(false);
    expect(isOwnAvatarPath("u-1", "u-1/../u-2/x")).toBe(false);
    expect(isOwnAvatarPath("u-1", null)).toBe(false);
  });

  it("crops the centre square", () => {
    expect(centerCrop(1200, 800)).toEqual([200, 0, 800]);
    expect(centerCrop(600, 900)).toEqual([0, 150, 600]);
  });
});
