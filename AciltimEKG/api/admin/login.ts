import bcrypt from "bcryptjs";
import type { ApiRequest, ApiResponse } from "../_lib/http";
import { badRequest, methodNotAllowed, ok, readJsonBody, serverError, unauthorized } from "../_lib/http";
import { setSessionCookie } from "../_lib/auth";

interface LoginBody {
  username?: string;
  password?: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { username, password } = await readJsonBody<LoginBody>(req);
    if (!username || !password) return badRequest(res, "Kullanıcı adı ve şifre gerekli.");

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;
    if (!expectedUsername || !expectedHash) {
      console.error("[login] ADMIN_USERNAME / ADMIN_PASSWORD_HASH ortam değişkenleri tanımlı değil.");
      return serverError(res, new Error("Sunucu yapılandırması eksik."));
    }

    const usernameMatches = username === expectedUsername;
    const passwordMatches = await bcrypt.compare(password, expectedHash);

    if (!usernameMatches || !passwordMatches) {
      return unauthorized(res, "Kullanıcı adı veya şifre hatalı.");
    }

    setSessionCookie(res, username);
    return ok(res, { ok: true, username });
  } catch (err) {
    return serverError(res, err);
  }
}
