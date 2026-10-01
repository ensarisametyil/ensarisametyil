import bcrypt from "bcryptjs";
import type { ApiRequest, ApiResponse } from "../_lib/http.js";
import { badRequest, methodNotAllowed, ok, readJsonBody, serverError, tooManyRequests, unauthorized } from "../_lib/http.js";
import { setSessionCookie } from "../_lib/auth.js";
import {
  checkLoginLock,
  ensureLoginAttemptsSchema,
  getClientIp,
  recordLoginFailure,
  recordLoginSuccess,
} from "../_lib/rateLimit.js";

interface LoginBody {
  username?: string;
  password?: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const ip = getClientIp(req);

    // Rate limiting is "best effort": if the DB is briefly unreachable, a
    // real admin must still be able to log in — a lock-out check should
    // never be the thing that takes down the only way into the admin panel.
    let locked = false;
    let retryAfterSeconds = 0;
    try {
      await ensureLoginAttemptsSchema();
      const lock = await checkLoginLock(ip);
      locked = lock.locked;
      retryAfterSeconds = lock.retryAfterSeconds;
    } catch (err) {
      console.error("[login] Deneme sınırlama kontrolü başarısız (DB erişilemiyor olabilir), sınırlama olmadan devam ediliyor:", err);
    }

    if (locked) {
      return tooManyRequests(
        res,
        `Çok fazla başarısız giriş denemesi. ${Math.ceil(retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
        retryAfterSeconds,
      );
    }

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
      await recordLoginFailure(ip).catch((err) => console.error("[login] Başarısız deneme kaydedilemedi:", err));
      return unauthorized(res, "Kullanıcı adı veya şifre hatalı.");
    }

    await recordLoginSuccess(ip).catch((err) => console.error("[login] Deneme sayacı sıfırlanamadı:", err));
    setSessionCookie(res, username);
    return ok(res, { ok: true, username });
  } catch (err) {
    return serverError(res, err);
  }
}
