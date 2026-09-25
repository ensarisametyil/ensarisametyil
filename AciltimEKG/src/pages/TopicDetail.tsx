import { useParams } from "react-router-dom";
import { categoryMap, type CategorySlug } from "../data/categories";
import { findTopic } from "../data/topics";
import { findDrug } from "../data/drugs";
import { isDynamicCategory } from "../lib/dynamicCategories";
import { useMeta } from "../lib/useMeta";
import { AlgorithmDetail } from "./AlgorithmDetail";
import { DrugDetail } from "./DrugDetail";
import { DynamicTopicDetail } from "./DynamicTopicDetail";
import { CategoryNotFound, TopicNotFound } from "./NotFound";

export function TopicDetail() {
  const { categorySlug = "", slug = "" } = useParams();

  if (isDynamicCategory(categorySlug)) {
    return <DynamicTopicDetail categorySlug={categorySlug} slug={slug} />;
  }

  return <StaticTopicDetail categorySlug={categorySlug} slug={slug} />;
}

/** Legacy static-data path for categories not yet migrated to the database (e.g. Ritimler, out-of-scope categories). */
function StaticTopicDetail({ categorySlug, slug }: { categorySlug: string; slug: string }) {
  const category = categoryMap[categorySlug as CategorySlug];
  const topic = category ? findTopic(category.slug, slug) : undefined;
  const drug = topic?.kind === "drug" ? findDrug(topic.slug) : undefined;

  useMeta(topic?.title ?? "Konu bulunamadı");

  if (!category) return <CategoryNotFound />;
  if (!topic) return <TopicNotFound />;
  if (topic.kind === "drug" && drug) return <DrugDetail drug={drug} categoryLabel={category.label} />;
  return <AlgorithmDetail topic={topic} />;
}
