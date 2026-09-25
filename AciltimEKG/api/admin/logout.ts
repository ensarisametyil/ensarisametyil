import type { ApiRequest, ApiResponse } from "../_lib/http";
import { methodNotAllowed, ok } from "../_lib/http";
import { clearSessionCookie } from "../_lib/auth";

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);
  clearSessionCookie(res);
  return ok(res, { ok: true });
}
