import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { methodNotAllowed, ok } from "../_lib/http.js";
import { getSession } from "../_lib/auth.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);
  const session = getSession(req);
  return ok(res, { authenticated: !!session, username: session?.username ?? null });
}
