import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useFavorites } from "../context/FavoritesContext";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Card } from "../components/ui";
import { useMeta } from "../lib/useMeta";

export function Favorites() {
  const { favorites, toggleFavorite } = useFavorites();
  useMeta(site.favorites.title);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "Favoriler" }]} />

      <h1 className="mt-6 text-3xl font-extrabold text-navy-900 sm:text-4xl">{site.favorites.title}</h1>
      <p className="prose-medical mt-3">{site.favorites.subtitle}</p>

      {favorites.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface-alt px-6 py-16 text-center">
          <Star className="h-8 w-8 text-ink-faint" />
          <p className="mt-4 text-sm font-medium text-ink-soft">{site.favorites.empty}</p>
          <Link to="/ekg" className="mt-5 text-sm font-semibold text-navy-900 hover:text-cyan-600">
            EKG kütüphanesine göz at →
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <Card key={f.key} className="flex flex-col gap-3 p-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">{f.categoryLabel}</span>
                <Link to={`/${f.categorySlug === "ekg" ? "ekg" : `kategori/${f.categorySlug}`}/${f.key.split("/")[1]}`}>
                  <p className="mt-1.5 text-sm font-semibold text-navy-900 hover:text-cyan-600">{f.title}</p>
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
