import { Link } from "react-router-dom";
import type { Topic } from "../data/topics";
import { categoryMap } from "../data/categories";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { Badge, PlaceholderNote, VisualPlaceholder } from "../components/ui";

export function AlgorithmDetail({ topic }: { topic: Topic }) {
  const category = categoryMap[topic.primaryCategory];

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: category.label, href: `/kategori/${category.slug}` },
          { label: topic.title },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Algoritma</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-navy-900 sm:text-4xl">{topic.title}</h1>
          {topic.crossCategories && topic.crossCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.crossCategories.map((c) => (
                <Link
                  key={c}
                  to={`/kategori/${c}`}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft hover:border-navy-500/40 hover:text-navy-900"
                >
                  {categoryMap[c].label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <FavoriteButton
          itemKey={`${topic.primaryCategory}/${topic.slug}`}
          title={topic.title}
          categorySlug={topic.primaryCategory}
          categoryLabel={category.label}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {topic.flowCaption && <VisualPlaceholder caption={topic.flowCaption} aspect="aspect-[3/4]" />}
        {topic.keyPointsCaption && <VisualPlaceholder caption={topic.keyPointsCaption} aspect="aspect-[3/4]" />}
      </div>

      <div className="prose-medical mt-8">
        <PlaceholderNote label={site.placeholder.note} text={site.placeholder.missing} />
      </div>
    </div>
  );
}
