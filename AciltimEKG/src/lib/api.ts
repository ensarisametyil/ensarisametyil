// Public (no-auth) reads from the /api/* backend, shared by the public site
// and the admin dashboard's live counts.

export interface PublicCategory {
  slug: string;
  label: string;
  count: number;
}

export interface PublicTopic {
  id: number;
  categorySlug: string;
  slug: string;
  title: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

export class ApiError extends Error {}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: options.body && typeof options.body === "string" ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error ?? "Beklenmeyen bir hata oluştu.");
  }
  return data as T;
}

export function getCategories() {
  return request<{ categories: PublicCategory[] }>("/api/categories").then((d) => d.categories);
}

export function getTopics(categorySlug: string) {
  return request<{ topics: PublicTopic[] }>(`/api/topics?category=${encodeURIComponent(categorySlug)}`).then(
    (d) => d.topics,
  );
}

export function getTopic(categorySlug: string, slug: string) {
  return request<{ topic: PublicTopic }>(
    `/api/topics?category=${encodeURIComponent(categorySlug)}&slug=${encodeURIComponent(slug)}`,
  ).then((d) => d.topic);
}
