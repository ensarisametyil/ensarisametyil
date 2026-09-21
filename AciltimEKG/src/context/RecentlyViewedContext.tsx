import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ContentKind } from "./FavoritesContext";

export interface RecentEntry {
  key: string; // `${categorySlug}/${slug}` or `ekg/${slug}`
  title: string;
  categorySlug: string;
  categoryLabel: string;
  kind: ContentKind;
  href: string;
  viewedAt: number;
}

interface RecentlyViewedValue {
  recent: RecentEntry[];
  recordView: (entry: Omit<RecentEntry, "viewedAt">) => void;
  clear: () => void;
}

const STORAGE_KEY = "aciltimekg.recent.v1";
const MAX_ENTRIES = 12;

const RecentlyViewedContext = createContext<RecentlyViewedValue | null>(null);

function readStorage(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: RecentEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable — recently-viewed stays in-memory for this session.
  }
}

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentEntry[]>(() => readStorage());

  const recordView = useCallback((entry: Omit<RecentEntry, "viewedAt">) => {
    setRecent((prev) => {
      const next = [{ ...entry, viewedAt: Date.now() }, ...prev.filter((e) => e.key !== entry.key)].slice(
        0,
        MAX_ENTRIES,
      );
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    writeStorage([]);
  }, []);

  const value = useMemo(() => ({ recent, recordView, clear }), [recent, recordView, clear]);

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}
