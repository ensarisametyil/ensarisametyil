import type { ApiRequest, ApiResponse } from "../_lib/http";
import { badRequest, methodNotAllowed, ok, readJsonBody, serverError } from "../_lib/http";
import { ensureSchema, query, withTransaction } from "../_lib/db";
import { requireAuth } from "../_lib/auth";
import { isDynamicCategory } from "../_lib/categories";

interface ReorderBody {
  categorySlug?: string;
  orderedIds?: number[];
}

/** Persists a full new ordering for one category's topics — the order numbers are always recomputed 0..n-1 from the array position, so they can never drift out of sequence. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    const { categorySlug, orderedIds } = await readJsonBody<ReorderBody>(req);
    if (!categorySlug || !isDynamicCategory(categorySlug)) return badRequest(res, "Geçerli bir kategori belirtin.");
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return badRequest(res, "Sıralama listesi gerekli.");

    await ensureSchema();

    // Ownership check: every id must actually belong to this category, so a
    // crafted request can't reorder (or leak the existence of) other rows.
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM topics WHERE category_slug = $1 AND id = ANY($2::int[])`,
      [categorySlug, orderedIds],
    );
    if (rows.length !== orderedIds.length) {
      return badRequest(res, "Sıralama listesi bu kategoriyle eşleşmiyor.");
    }

    await withTransaction(async (client) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(`UPDATE topics SET order_index = $1 WHERE id = $2 AND category_slug = $3`, [
          i,
          orderedIds[i],
          categorySlug,
        ]);
      }
    });

    return ok(res, { ok: true });
  } catch (err) {
    return serverError(res, err);
  }
}
