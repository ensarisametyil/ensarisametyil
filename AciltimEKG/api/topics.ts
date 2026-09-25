import type { ApiRequest, ApiResponse } from "./_lib/http";
import { badRequest, methodNotAllowed, notFound, ok, serverError } from "./_lib/http";
import { ensureSchema, query } from "./_lib/db";
import { isDynamicCategory } from "./_lib/categories";

interface TopicRow {
  id: number;
  category_slug: string;
  slug: string;
  title: string;
  content: string;
  image_url: string | null;
  order_index: number;
}

function toPublicTopic(row: TopicRow) {
  return {
    id: row.id,
    categorySlug: row.category_slug,
    slug: row.slug,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url,
    order: row.order_index,
  };
}

/** Public: list topics for a category, or fetch a single topic by category+slug. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const category = req.query.category;
  if (!category || !isDynamicCategory(category)) {
    return badRequest(res, "Geçerli bir kategori belirtin.");
  }

  try {
    await ensureSchema();

    if (req.query.slug) {
      const { rows } = await query<TopicRow>(
        `SELECT * FROM topics WHERE category_slug = $1 AND slug = $2 LIMIT 1`,
        [category, req.query.slug],
      );
      if (rows.length === 0) return notFound(res, "Konu bulunamadı.");
      return ok(res, { topic: toPublicTopic(rows[0]) });
    }

    const { rows } = await query<TopicRow>(
      `SELECT * FROM topics WHERE category_slug = $1 ORDER BY order_index ASC, id ASC`,
      [category],
    );
    return ok(res, { topics: rows.map(toPublicTopic) });
  } catch (err) {
    return serverError(res, err);
  }
}
