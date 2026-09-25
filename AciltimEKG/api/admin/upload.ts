import { readFile } from "node:fs/promises";
import formidable from "formidable";
import type { ApiRequest, ApiResponse } from "../_lib/http";
import { badRequest, methodNotAllowed, ok, serverError } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { optimizeImage, storeImage } from "../_lib/storage";

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_SIZE_BYTES = 15 * 1024 * 1024;

/** Protected: accepts a single multipart image upload, optimizes it, and returns its stored URL. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const form = formidable({ maxFiles: 1, maxFileSize: MAX_SIZE_BYTES });
    const [, files] = await form.parse(req);

    const uploaded = files.file?.[0] ?? files.image?.[0];
    if (!uploaded) return badRequest(res, "Görsel dosyası bulunamadı.");
    if (uploaded.mimetype && !ALLOWED_TYPES.has(uploaded.mimetype)) {
      return badRequest(res, "Desteklenmeyen dosya türü. JPEG, PNG, WebP veya HEIC yükleyin.");
    }

    const buffer = await readFile(uploaded.filepath);
    const optimized = await optimizeImage(buffer);
    const imageUrl = await storeImage(optimized, uploaded.originalFilename ?? "image");

    return ok(res, { imageUrl });
  } catch (err) {
    return serverError(res, err);
  }
}
