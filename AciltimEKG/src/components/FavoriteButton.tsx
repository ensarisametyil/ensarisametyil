import { useState } from "react";
import { Star } from "lucide-react";
import { useFavorites, type ContentKind } from "../context/FavoritesContext";
import { cn } from "../lib/cn";

export function FavoriteButton({
  itemKey,
  title,
  categorySlug,
  categoryLabel,
  kind,
  href,
  compact = false,
}: {
  itemKey: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  kind: ContentKind;
  href: string;
  compact?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(itemKey);
  const [popped, setPopped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        toggleFavorite({ key: itemKey, title, categorySlug, categoryLabel, kind, href });
        setPopped(true);
        setTimeout(() => setPopped(false), 350);
      }}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      title={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={cn(
        "flex items-center gap-2 rounded-lg border font-semibold transition-colors",
        compact ? "p-2" : "px-3.5 py-2 text-sm",
        active
          ? "border-crit-600/30 bg-crit-100 text-crit-700"
          : "border-line text-ink-soft hover:border-navy-500/40 hover:text-heading",
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-crit-600 text-crit-600", popped && "favorite-pop")} />
      {!compact && (active ? "Favorilerde" : "Favorilere ekle")}
    </button>
  );
}
