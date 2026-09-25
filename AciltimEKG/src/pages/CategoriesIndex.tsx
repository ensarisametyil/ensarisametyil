import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { categories, type CategorySlug } from "../data/categories";
import { itemsForCategory } from "../lib/categoryItems";
import { isDynamicCategory } from "../lib/dynamicCategories";
import { getCategories } from "../lib/api";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Card } from "../components/ui";
import { useMeta } from "../lib/useMeta";

function itemCount(slug: CategorySlug, counts: Record<string, number>): number {
  return isDynamicCategory(slug) ? (counts[slug] ?? 0) : itemsForCategory(slug).length;
}

export function CategoriesIndex() {
  useMeta("Kategoriler", "ACİLTİMEKG'nin tüm içerik kategorileri: algoritmalar, ilaçlar, ritimler ve daha fazlası.");

  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getCategories()
      .then((cats) => {
        if (!cancelled) setCounts(Object.fromEntries(cats.map((c) => [c.slug, c.count])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "Kategoriler" }]} />

      <h1 className="mt-6 text-3xl font-extrabold text-heading sm:text-4xl">Kategoriler</h1>
      <p className="prose-medical mt-3">Tüm bilgi alanlarına buradan ulaşabilirsiniz.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.slug} to={`/kategori/${c.slug}`} className="group">
            <Card className="flex h-full flex-col justify-between p-5">
              <div>
                <p className="text-base font-bold text-heading">{c.label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{c.description}</p>
              </div>
              <span className="mt-5 flex items-center justify-between text-sm font-semibold text-cyan-600">
                {itemCount(c.slug, counts)} içerik
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
