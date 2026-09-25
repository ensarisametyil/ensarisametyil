import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ContentKind = "algorithm" | "drug" | "rhythm" | "article" | "category" | "topic";

export interface FavoriteEntry {
  key: string; // `${categorySlug}/${topicSlug}` or `ekg/${slug}`
  title: string;
  categorySlug: string;
  categoryLabel: string;
  kind: ContentKind;
  href: string;
}

interface FavoritesValue {
  favorites: FavoriteEntry[];
  isFavorite: (key: string) => boolean;
  toggleFavorite: (entry: FavoriteEntry) => void;
}

const STORAGE_KEY = "aciltimekg.favorites.v2";
const LEGACY_KEY = "aciltimekg.favorites.v1";

const FavoritesContext = createContext<FavoritesValue | null>(null);

function readStorage(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FavoriteEntry[];
    // Best-effort migration from the pre-kind/href favorites shape.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy) as Omit<FavoriteEntry, "kind" | "href">[];
    return parsed.map((f) => ({
      ...f,
      kind: "algorithm" as const,
      href: `/kategori/${f.categorySlug}/${f.key.split("/")[1] ?? ""}`,
    }));
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>(() => readStorage());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // localStorage unavailable (private mode, quota) — favorites stay in-memory for this session.
    }
  }, [favorites]);

  const isFavorite = useCallback((key: string) => favorites.some((f) => f.key === key), [favorites]);

  const toggleFavorite = useCallback((entry: FavoriteEntry) => {
    setFavorites((prev) =>
      prev.some((f) => f.key === entry.key) ? prev.filter((f) => f.key !== entry.key) : [entry, ...prev],
    );
  }, []);

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
