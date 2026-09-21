import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, FolderKanban, Star, History } from "lucide-react";
import { categories } from "../data/categories";
import { useFavorites } from "../context/FavoritesContext";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { cn } from "../lib/cn";

const STORAGE_KEY = "aciltimekg.sidebar.v1";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "open";
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const { favorites } = useFavorites();
  const { recent } = useRecentlyViewed();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "open");
    } catch {
      // localStorage unavailable — collapse state stays in-memory for this session.
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "no-print sticky top-0 hidden max-h-dvh shrink-0 self-start overflow-y-auto border-r border-line bg-card transition-[width] duration-200 xl:flex xl:flex-col",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-end px-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Kenar çubuğunu genişlet" : "Kenar çubuğunu daralt"}
          className="rounded-lg p-2 text-ink-faint hover:bg-surface-alt hover:text-heading"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-6 px-3 pb-6">
        <div>
          {!collapsed && (
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Kategoriler</p>
          )}
          <ul className="space-y-1">
            {categories.map((c) => {
              const href = `/kategori/${c.slug}`;
              const active = location.pathname.startsWith(href);
              return (
                <li key={c.slug}>
                  <Link
                    to={href}
                    title={collapsed ? c.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-navy-900 text-white" : "text-ink-soft hover:bg-surface-alt hover:text-heading",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{c.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          {!collapsed && (
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Favoriler</p>
          )}
          <Link
            to="/favoriler"
            title={collapsed ? "Favoriler" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-surface-alt hover:text-heading",
              collapsed && "justify-center px-0",
            )}
          >
            <Star className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Favoriler ({favorites.length})</span>}
          </Link>
        </div>

        {recent.length > 0 && (
          <div>
            {!collapsed && (
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                Son Görüntülenenler
              </p>
            )}
            <ul className="space-y-1">
              {(collapsed ? recent.slice(0, 1) : recent.slice(0, 6)).map((r) => (
                <li key={r.key}>
                  <Link
                    to={r.href}
                    title={collapsed ? r.title : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-surface-alt hover:text-heading",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <History className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{r.title}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
