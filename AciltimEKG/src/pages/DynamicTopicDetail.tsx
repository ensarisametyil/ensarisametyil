import { useEffect, useState } from "react";
import { categoryMap, type CategorySlug } from "../data/categories";
import { getTopic, type PublicTopic } from "../lib/api";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { CategoryNotFound, TopicNotFound } from "./NotFound";

export function DynamicTopicDetail({ categorySlug, slug }: { categorySlug: CategorySlug; slug: string }) {
  const category = categoryMap[categorySlug];
  const [topic, setTopic] = useState<PublicTopic | null | undefined>(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    setTopic(undefined);
    getTopic(categorySlug, slug)
      .then((t) => {
        if (!cancelled) setTopic(t);
      })
      .catch(() => {
        if (!cancelled) setTopic(null);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug, slug]);

  useMeta(topic ? topic.title : category?.label ?? "Konu bulunamadı");

  const href = `/kategori/${categorySlug}/${slug}`;
  useRecordView(
    topic && category
      ? {
          key: `${categorySlug}/${slug}`,
          title: topic.title,
          categorySlug,
          categoryLabel: category.label,
          kind: "topic",
          href,
        }
      : null,
  );

  if (!category) return <CategoryNotFound />;
  if (topic === undefined) {
    return <div className="container-page py-16 text-center text-sm text-ink-faint">Yükleniyor…</div>;
  }
  if (topic === null) return <TopicNotFound />;

  return (
    <div className="container-page py-10 sm:py-14">
      <ScrollProgress />
      <Breadcrumbs
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: category.label, href: `/kategori/${category.slug}` },
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
            itemKey={`${categorySlug}/${slug}`}
            title={topic.title}
            categorySlug={categorySlug}
            categoryLabel={category.label}
            kind="topic"
            href={href}
          />
        </div>
      </div>

      <div className="mt-8 max-w-3xl space-y-8">
        {topic.imageUrl && (
          <img src={topic.imageUrl} alt={topic.title} className="w-full rounded-2xl border border-line object-cover" />
        )}
        {topic.content ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{topic.content}</p>
        ) : (
          <p className="text-sm text-ink-faint">Bu konu için henüz içerik eklenmemiş.</p>
        )}
      </div>
    </div>
  );
}
