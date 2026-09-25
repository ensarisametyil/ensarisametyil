// Thin fetch wrapper around the /api/* backend (see AciltimEKG/api). Same-origin
// on Vercel; proxied to the local dev-api server by Vite in development.

export interface AdminCategory {
  slug: string;
  label: string;
  count: number;
}

export interface AdminTopic {
  id: number;
  categorySlug: string;
  slug: string;
  title: string;
  content: string;
  imageUrl: string | null;
  order: number;
}

export class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export function login(username: string, password: string) {
  return request<{ ok: true; username: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request<{ ok: true }>("/api/admin/logout", { method: "POST" });
}

export function getSession() {
  return request<{ authenticated: boolean; username: string | null }>("/api/admin/session");
}

export function getCategories() {
  return request<{ categories: AdminCategory[] }>("/api/categories").then((d) => d.categories);
}

export function getAdminTopics(categorySlug: string) {
  return request<{ topics: AdminTopic[] }>(`/api/admin/topic?category=${encodeURIComponent(categorySlug)}`).then(
    (d) => d.topics,
  );
}

export function createTopic(input: { categorySlug: string; title: string; content: string; imageUrl?: string | null }) {
  return request<{ topic: AdminTopic }>("/api/admin/topic", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((d) => d.topic);
}

export function updateTopic(id: number, patch: { title?: string; content?: string; imageUrl?: string | null }) {
  return request<{ topic: AdminTopic }>(`/api/admin/topic?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  }).then((d) => d.topic);
}

export function deleteTopic(id: number) {
  return request<{ ok: true }>(`/api/admin/topic?id=${id}`, { method: "DELETE" });
}

export function reorderTopics(categorySlug: string, orderedIds: number[]) {
  return request<{ ok: true }>("/api/admin/reorder", {
    method: "POST",
    body: JSON.stringify({ categorySlug, orderedIds }),
  });
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Görsel yüklenemedi.");
  return (data as { imageUrl: string }).imageUrl;
}
