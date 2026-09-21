import { Star } from "lucide-react";
import { useFavorites } from "../context/FavoritesContext";
import { cn } from "../lib/cn";

export function FavoriteButton({
  itemKey,
  title,
  categorySlug,
  categoryLabel,
}: {
  itemKey: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(itemKey);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite({ key: itemKey, title, categorySlug, categoryLabel })}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-crit-600/30 bg-crit-100 text-crit-700"
          : "border-line text-ink-soft hover:border-navy-500/40 hover:text-navy-900",
      )}
    >
      <Star className={cn("h-4 w-4", active && "fill-crit-600 text-crit-600")} />
      {active ? "Favorilerde" : "Favorilere ekle"}
    </button>
  );
}
