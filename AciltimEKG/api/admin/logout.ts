import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { methodNotAllowed, ok } from "../_lib/http.js";
import { clearSessionCookie } from "../_lib/auth.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  clearSessionCookie(res);
  return ok(res, { ok: true });
}
