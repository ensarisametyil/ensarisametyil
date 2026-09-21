import { useParams } from "react-router-dom";
import { categoryMap, type CategorySlug } from "../data/categories";
import { findTopic } from "../data/topics";
import { findDrug } from "../data/drugs";
import { useMeta } from "../lib/useMeta";
import { AlgorithmDetail } from "./AlgorithmDetail";
import { DrugDetail } from "./DrugDetail";
import { CategoryNotFound, TopicNotFound } from "./NotFound";

export function TopicDetail() {
  const { categorySlug = "", slug = "" } = useParams();
  const category = categoryMap[categorySlug as CategorySlug];
  const topic = category ? findTopic(category.slug, slug) : undefined;
  const drug = topic?.kind === "drug" ? findDrug(topic.slug) : undefined;

  useMeta(topic?.title ?? "Konu bulunamadı");

  if (!category) return <CategoryNotFound />;
  if (!topic) return <TopicNotFound />;
  if (topic.kind === "drug" && drug) return <DrugDetail drug={drug} categoryLabel={category.label} />;
  return <AlgorithmDetail topic={topic} />;
}
