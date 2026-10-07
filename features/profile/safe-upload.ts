import "server-only";
import sharp from "sharp";
import { sniffAvatarType } from "./avatar-image";

const MAX_INPUT_PIXELS = 16_000_000;

export type PreparedImage =
  | { status: "ready"; bytes: Uint8Array; type: "image/webp" }
  | { status: "invalid" | "too_large" };

/** Decode untrusted bytes, bound decompression, then create a new image without metadata. */
export async function prepareImageUpload(
  bytes: Uint8Array,
  options: { maxSide: number; maxBytes: number; square: boolean },
): Promise<PreparedImage> {
  if (!sniffAvatarType(bytes)) return { status: "invalid" };
  if (bytes.byteLength > options.maxBytes) return { status: "too_large" };

  try {
    const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
    const resized = options.square
      ? image.resize(options.maxSide, options.maxSide, { fit: "cover", position: "centre" })
      : image.resize(options.maxSide, options.maxSide, { fit: "inside", withoutEnlargement: true });
    const safe = await resized.webp({ quality: 80 }).toBuffer();
    if (safe.byteLength > options.maxBytes) return { status: "too_large" };
    return { status: "ready", bytes: new Uint8Array(safe), type: "image/webp" };
  } catch {
    return { status: "invalid" };
  }
}

/** Re-encode older private Storage objects before an authorized app response. */
export async function sanitizeStoredImage(
  file: Blob,
  options: { maxSide: number; maxBytes: number; square: boolean },
): Promise<Blob | null> {
  if (file.size === 0 || file.size > options.maxBytes) return null;
  try {
    const result = await prepareImageUpload(new Uint8Array(await file.arrayBuffer()), options);
    return result.status === "ready" ? new Blob([Uint8Array.from(result.bytes)], { type: result.type }) : null;
  } catch {
    return null;
  }
}
