import type { ApiRequest, ApiResponse } from "../_lib/http";
import { badRequest, methodNotAllowed, notFound, ok, readJsonBody, serverError } from "../_lib/http";
import { ensureSchema, query } from "../_lib/db";
import { requireAuth } from "../_lib/auth";
import { isDynamicCategory } from "../_lib/categories";
import { slugify } from "../_lib/slugify";

interface TopicRow {
  id: number;
  category_slug: string;
  slug: string;
  title: string;
  content: string;
  image_url: string | null;
  order_index: number;
}

function toAdminTopic(row: TopicRow) {
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

async function uniqueSlug(categorySlug: string, title: string, excludeId?: number): Promise<string> {
  const base = slugify(title) || "konu";
  let candidate = base;
  let n = 2;
  for (;;) {
    const { rows } = await query<{ id: number }>(
      `SELECT id FROM topics WHERE category_slug = $1 AND slug = $2 AND id IS DISTINCT FROM $3`,
      [categorySlug, candidate, excludeId ?? null],
    );
    if (rows.length === 0) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

interface CreateBody {
  categorySlug?: string;
  title?: string;
  content?: string;
  imageUrl?: string;
}

interface UpdateBody {
  title?: string;
  content?: string;
  imageUrl?: string | null;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const session = requireAuth(req, res);
  if (!session) return;

  try {
    await ensureSchema();

    if (req.method === "GET") {
      const category = req.query.category;
      if (!category || !isDynamicCategory(category)) return badRequest(res, "Geçerli bir kategori belirtin.");
      const { rows } = await query<TopicRow>(
        `SELECT * FROM topics WHERE category_slug = $1 ORDER BY order_index ASC, id ASC`,
        [category],
      );
      return ok(res, { topics: rows.map(toAdminTopic) });
    }

    if (req.method === "POST") {
      const body = await readJsonBody<CreateBody>(req);
      if (!body.categorySlug || !isDynamicCategory(body.categorySlug)) {
        return badRequest(res, "Geçerli bir kategori belirtin.");
      }
      if (!body.title?.trim()) return badRequest(res, "Başlık gerekli.");

      const slug = await uniqueSlug(body.categorySlug, body.title);
      const { rows: maxRows } = await query<{ max: number | null }>(
        `SELECT MAX(order_index) AS max FROM topics WHERE category_slug = $1`,
        [body.categorySlug],
      );
      const nextOrder = (maxRows[0]?.max ?? -1) + 1;

      const { rows } = await query<TopicRow>(
        `INSERT INTO topics (category_slug, slug, title, content, image_url, order_index)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [body.categorySlug, slug, body.title.trim(), body.content ?? "", body.imageUrl ?? null, nextOrder],
      );
      return ok(res, { topic: toAdminTopic(rows[0]) });
    }

    const id = Number(req.query.id);
    if (!id) return badRequest(res, "Geçerli bir konu id'si belirtin.");

    if (req.method === "PUT") {
      const body = await readJsonBody<UpdateBody>(req);
      const { rows: existingRows } = await query<TopicRow>(`SELECT * FROM topics WHERE id = $1`, [id]);
      if (existingRows.length === 0) return notFound(res, "Konu bulunamadı.");

      const title = body.title?.trim() || existingRows[0].title;
      const content = body.content ?? existingRows[0].content;
      const imageUrl = body.imageUrl === undefined ? existingRows[0].image_url : body.imageUrl;

      const { rows } = await query<TopicRow>(
        `UPDATE topics SET title = $1, content = $2, image_url = $3, updated_at = now() WHERE id = $4 RETURNING *`,
        [title, content, imageUrl, id],
      );
      return ok(res, { topic: toAdminTopic(rows[0]) });
    }

    if (req.method === "DELETE") {
      const { rowCount } = await query(`DELETE FROM topics WHERE id = $1`, [id]);
      if (!rowCount) return notFound(res, "Konu bulunamadı.");
      return ok(res, { ok: true });
    }

    return methodNotAllowed(res);
  } catch (err) {
    return serverError(res, err);
  }
}
