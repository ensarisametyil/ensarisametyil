import type { ApiRequest, ApiResponse } from "./_lib/http.js";
import { methodNotAllowed, ok, serverError } from "./_lib/http.js";
import { ensureSchema, query } from "./_lib/db.js";
import { DYNAMIC_CATEGORIES } from "./_lib/categories.js";

/** Public: list the database-backed categories with their live topic counts. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    await ensureSchema();
    const { rows } = await query<{ category_slug: string; count: string }>(
      `SELECT category_slug, COUNT(*)::text AS count FROM topics GROUP BY category_slug`,
    );
    const counts = new Map(rows.map((r) => [r.category_slug, Number(r.count)]));

    const categories = DYNAMIC_CATEGORIES.map((c) => ({
      slug: c.slug,
      label: c.label,
      count: counts.get(c.slug) ?? 0,
    }));

    return ok(res, { categories });
  } catch (err) {
    return serverError(res, err);
  }
}
