import { Link, useLocation } from "react-router-dom";
import { Home, Search, FolderKanban, Star } from "lucide-react";
import { useFavorites } from "../context/FavoritesContext";
import { cn } from "../lib/cn";

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const location = useLocation();
  const { favorites } = useFavorites();

  const items = [
    { to: "/", label: "Anasayfa", icon: Home, active: location.pathname === "/" },
    { label: "Ara", icon: Search, onClick: onOpenSearch, active: location.pathname === "/arama" },
    { to: "/kategoriler", label: "Kategoriler", icon: FolderKanban, active: location.pathname.startsWith("/kategori") },
    { to: "/favoriler", label: "Favoriler", icon: Star, active: location.pathname === "/favoriler", badge: favorites.length },
  ];

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Alt gezinme"
    >
      <div className="grid grid-cols-4">
        {items.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                item.active ? "text-cyan-600" : "text-ink-faint",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {!!item.badge && (
                <span className="absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit-600 px-1 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                item.active ? "text-cyan-600" : "text-ink-faint",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
