import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { categoryMap, type CategorySlug } from "../data/categories";
import { topicsByCategory } from "../data/topics";
import { drugs } from "../data/drugs";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Card } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { CategoryNotFound } from "./NotFound";

export function CategoryHub() {
  const { slug = "" } = useParams();
  const category = categoryMap[slug as CategorySlug];

  useMeta(category ? category.label : "Kategori bulunamadı", category?.description);

  if (!category) return <CategoryNotFound />;

  const items = topicsByCategory(category.slug);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: category.label }]} />

      <h1 className="mt-6 text-3xl font-extrabold text-navy-900 sm:text-4xl">{category.label}</h1>
      <p className="prose-medical mt-3">{category.description}</p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line bg-surface-alt px-5 py-8 text-center text-sm text-ink-faint">
          Bu kategoride henüz yayınlanmış konu yok.
        </div>
      ) : (
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((topic) => (
            <Link key={topic.slug} to={`/kategori/${category.slug}/${topic.slug}`}>
              <Card className="flex h-full flex-col justify-between gap-4 p-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">
                    {topic.kind === "drug" ? "İlaç Kartı" : "Algoritma"}
                  </span>
                  <p className="mt-1.5 text-sm font-semibold text-navy-900">{topic.title}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900/70">
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
