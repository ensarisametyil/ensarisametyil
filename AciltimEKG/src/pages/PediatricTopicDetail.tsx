import { categoryMap } from "../data/categories";
import { findPediatricTopic } from "../data/pediatricAlgorithms";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { TopicNotFound } from "./NotFound";

/**
 * Static counterpart of DynamicTopicDetail for the "Pediatri Algoritmalar"
 * category — same minimal, image-only presentation, but reads from
 * src/data/pediatricAlgorithms.ts instead of the database (no fetch/loading
 * state needed since the data is bundled with the app, same as EkgDetail
 * and AlgorithmTopicDetail).
 */
export function PediatricTopicDetail({ slug }: { slug: string }) {
  const category = categoryMap["pediatri"];
  const topic = findPediatricTopic(slug);

  useMeta(topic ? topic.title : category.label);

  const href = `/kategori/pediatri/${slug}`;
  useRecordView(
    topic
      ? {
          key: `pediatri/${slug}`,
          title: topic.title,
          categorySlug: "pediatri",
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
          { label: category.label, href: "/kategori/pediatri" },
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
            itemKey={`pediatri/${slug}`}
            title={topic.title}
            categorySlug="pediatri"
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
