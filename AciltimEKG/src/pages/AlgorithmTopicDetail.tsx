import { categoryMap } from "../data/categories";
import { findAlgorithmTopic } from "../data/algorithms";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { TopicNotFound } from "./NotFound";

/**
 * Static counterpart of DynamicTopicDetail for the "Yetişkin Algoritmalar"
 * category — same minimal, image-only presentation, but reads from
 * src/data/algorithms.ts instead of the database (no fetch/loading state
 * needed since the data is bundled with the app, same as EkgDetail).
 */
export function AlgorithmTopicDetail({ slug }: { slug: string }) {
  const category = categoryMap["acil-yaklasimlar"];
  const topic = findAlgorithmTopic(slug);

  useMeta(topic ? topic.title : category.label);

  const href = `/kategori/acil-yaklasimlar/${slug}`;
  useRecordView(
    topic
      ? {
          key: `acil-yaklasimlar/${slug}`,
          title: topic.title,
          categorySlug: "acil-yaklasimlar",
          categoryLabel: category.label,
          kind: "topic",
          href,
        }
      : null,
  );

  if (!topic) return <TopicNotFound />;

  return (
    <div className="container-page py-10 sm:py-14">
      <ScrollProgress />
      <Breadcrumbs
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: category.label, href: "/kategori/acil-yaklasimlar" },
          { label: topic.title },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>{category.label}</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-heading sm:text-4xl">{topic.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton title={topic.title} />
          <PrintButton />
          <FavoriteButton
            itemKey={`acil-yaklasimlar/${slug}`}
            title={topic.title}
            categorySlug="acil-yaklasimlar"
            categoryLabel={category.label}
            kind="topic"
            href={href}
          />
        </div>
      </div>

      <div className="mt-8 max-w-3xl">
        <img src={topic.image} alt={topic.title} className="w-full rounded-2xl border border-line object-cover" />
      </div>
    </div>
  );
}
