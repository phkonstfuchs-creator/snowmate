/* Rules for profile pictures, shared by the upload action and its
   tests. The browser resizes and re-encodes the picture before upload
   (which also drops EXIF data such as the GPS position); the server
   checks again what it receives. */

export const AVATAR_MAX_BYTES = 512 * 1024;
export const AVATAR_SIZE_PX = 512;
export const AVATAR_BUCKET = "avatars";

export type AvatarType = "image/webp" | "image/jpeg";

/* The type from the file's first bytes, not from its name or header. */
export function sniffAvatarType(bytes: Uint8Array): AvatarType | null {
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

/* <user id>/<random>.<ext>: the folder is the owner, the name changes
   with every upload so caches never show an old picture. */
export function avatarPath(userId: string, type: AvatarType, random: string): string {
  return `${userId}/${random}.${type === "image/webp" ? "webp" : "jpg"}`;
}

export function isOwnAvatarPath(userId: string, path: unknown): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.includes("..") && path.length <= 255;
}

/* The square crop of an image, centred: [sx, sy, side]. */
export function centerCrop(width: number, height: number): [number, number, number] {
  const side = Math.min(width, height);
  return [Math.round((width - side) / 2), Math.round((height - side) / 2), side];
}
