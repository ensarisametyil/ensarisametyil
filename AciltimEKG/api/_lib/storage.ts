import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_WIDTH = 1600;
const WEBP_QUALITY = 82;

/** Resizes (capped width) and re-encodes to WebP — shrinks typical phone-camera photos by 70-90% with no visible quality loss. */
export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // respect EXIF orientation from phone cameras
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/**
 * Uploads an already-optimized image and returns its public URL.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is configured (production);
 * otherwise falls back to writing into public/uploads for local development
 * so the whole upload flow can be tested without a Blob token.
 */
export async function storeImage(buffer: Buffer, originalName: string): Promise<string> {
  const filename = `${randomUUID()}.webp`;
  void originalName;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: "image/webp",
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);
  console.warn(
    "[storage] BLOB_READ_WRITE_TOKEN tanımlı değil — görsel yerel public/uploads klasörüne kaydedildi (yalnızca geliştirme için; production'da kalıcı değildir).",
  );
  return `/uploads/${filename}`;
}
