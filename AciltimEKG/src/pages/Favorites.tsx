import { useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useFavorites, type ContentKind } from "../context/FavoritesContext";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Card } from "../components/ui";
import { cn } from "../lib/cn";
import { useMeta } from "../lib/useMeta";

type FilterValue = "all" | ContentKind;

const filters: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "algorithm", label: "Algoritmalar" },
  { value: "drug", label: "İlaçlar" },
  { value: "rhythm", label: "Ritimler" },
  { value: "article", label: "Makaleler" },
  { value: "topic", label: "Konular" },
];

export function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();
  const [filter, setFilter] = useState<FilterValue>("all");
  useMeta(site.favorites.title);

  const filtered = filter === "all" ? favorites : favorites.filter((f) => f.kind === filter);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "Favoriler" }]} />

      <h1 className="mt-6 text-3xl font-extrabold text-heading sm:text-4xl">{site.favorites.title}</h1>
      <p className="prose-medical mt-3">{site.favorites.subtitle}</p>

      {favorites.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                filter === f.value
                  ? "border-navy-900 bg-navy-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-navy-950"
                  : "border-line text-ink-soft hover:border-navy-500/40 hover:text-heading",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface-alt px-6 py-16 text-center">
          <Star className="h-8 w-8 text-ink-faint" />
          <p className="mt-4 text-sm font-medium text-ink-soft">{site.favorites.empty}</p>
          <p className="mt-1 text-xs text-ink-faint">
            Bir algoritma, ilaç veya ritim sayfasındaki yıldız simgesine dokunarak buraya ekleyin.
          </p>
          <Link to="/ekg" className="mt-5 text-sm font-semibold text-heading hover:text-cyan-600">
            EKG kütüphanesine göz at →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-surface-alt px-6 py-12 text-center text-sm text-ink-faint">
          Bu filtrede favori içerik yok.
        </div>
      ) : (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => (
            <Card key={f.key} className="flex flex-col gap-3 p-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">{f.categoryLabel}</span>
                <Link to={f.href}>
                  <p className="mt-1.5 text-sm font-semibold text-heading hover:text-cyan-600">{f.title}</p>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(f)}
                className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-crit-600"
              >
                <Star className="h-3.5 w-3.5 fill-crit-600 text-crit-600" /> Kaldır
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
