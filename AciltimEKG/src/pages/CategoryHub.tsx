import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { categoryMap, type CategorySlug } from "../data/categories";
import { drugs } from "../data/drugs";
import { popularityScore, isPopular } from "../lib/demoSignals";
import { itemsForCategory } from "../lib/categoryItems";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EkgWaveformGraphic } from "../components/EkgWaveform";
import { Card, Badge } from "../components/ui";
import { cn } from "../lib/cn";
import { useMeta } from "../lib/useMeta";
import { CategoryNotFound } from "./NotFound";

type SortMode = "alfabetik" | "son-eklenen" | "sik-kullanilan";

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "alfabetik", label: "Alfabetik" },
  { value: "son-eklenen", label: "Son Eklenen" },
  { value: "sik-kullanilan", label: "Sık Kullanılan" },
];

export function CategoryHub() {
  const { slug = "" } = useParams();
  const category = categoryMap[slug as CategorySlug];
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("alfabetik");
  const [onlyPopular, setOnlyPopular] = useState(false);

  useMeta(category ? category.label : "Kategori bulunamadı", category?.description);

  const allItems = useMemo(() => (category ? itemsForCategory(category.slug) : []), [category]);

  const items = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    let list = allItems.filter((t) => !q || t.title.toLocaleLowerCase("tr").includes(q));
    if (onlyPopular) list = list.filter((t) => isPopular(t.slug));

    list = [...list];
    if (sort === "alfabetik") {
      list.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    } else if (sort === "son-eklenen") {
      list.reverse();
    } else if (sort === "sik-kullanilan") {
      list.sort((a, b) => popularityScore(b.slug) - popularityScore(a.slug));
    }
    return list;
  }, [allItems, query, sort, onlyPopular]);

  if (!category) return <CategoryNotFound />;

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: category.label }]} />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-heading sm:text-4xl">{category.label}</h1>
          <p className="prose-medical mt-3">{category.description}</p>
        </div>
        <Badge>{allItems.length} içerik</Badge>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${category.label} içinde ara…`}
            className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyPopular((v) => !v)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              onlyPopular
                ? "border-navy-900 bg-navy-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-navy-950"
                : "border-line text-ink-soft hover:text-heading",
            )}
          >
            Sadece sık kullanılan
          </button>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={cn(
                  "px-3 py-2 text-xs font-semibold transition-colors",
                  sort === opt.value ? "bg-navy-900 text-white" : "bg-card text-ink-soft hover:text-heading",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-surface-alt px-5 py-10 text-center text-sm text-ink-faint">
          {allItems.length === 0 ? "Bu kategoride henüz yayınlanmış konu yok." : "Aradığınız içerik bulunamadı."}
        </div>
      ) : items[0]?.showWaveform ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.slug}
              to={item.href}
              className="group overflow-hidden rounded-xl border border-line bg-navy-950 transition-colors hover:border-cyan-500/50"
            >
              <div className="aspect-[16/10]">
                <EkgWaveformGraphic seed={item.slug} />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-navy-900 px-4 py-3">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                {isPopular(item.slug) && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                    Sık
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.slug} to={item.href}>
              <Card className="flex h-full flex-col justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">
                      {item.kindLabel}
                    </span>
                    {isPopular(item.slug) && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Sık kullanılan
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-heading">{item.title}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading/70">
                  Detay <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {category.slug === "ilaclar" && (
        <p className="mt-6 text-xs text-ink-faint">
          Kaynakta tam doz kartı ile yayınlanmış {drugs.length} ilaç listelenmiştir; kütüphane genişlemeye devam
          etmektedir.
        </p>
      )}
    </div>
  );
}
