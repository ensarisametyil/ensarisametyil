import { Link } from "react-router-dom";
import { ListChecks, AlertTriangle, BookOpen } from "lucide-react";
import type { Topic } from "../data/topics";
import { categoryMap } from "../data/categories";
import { site } from "../data/site";
import { relatedForTopic } from "../lib/related";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { TableOfContents, type TocItem } from "../components/TableOfContents";
import { RelatedContent } from "../components/RelatedContent";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge, PlaceholderNote, VisualPlaceholder } from "../components/ui";

export function AlgorithmDetail({ topic }: { topic: Topic }) {
  const category = categoryMap[topic.primaryCategory];
  const href = `/kategori/${topic.primaryCategory}/${topic.slug}`;
  useRecordView({
    key: `${topic.primaryCategory}/${topic.slug}`,
    title: topic.title,
    categorySlug: topic.primaryCategory,
    categoryLabel: category.label,
    kind: "algorithm",
    href,
  });
  const related = relatedForTopic(topic);

  const toc: TocItem[] = [
    { id: "genel-bakis", label: "Genel Bakış" },
    ...(topic.flowCaption || topic.keyPointsCaption ? [{ id: "gorseller", label: "Görseller" }] : []),
    { id: "adimlar", label: "Adım Adım Yaklaşım" },
    { id: "uyarilar", label: "Uyarılar ve Kritik Notlar" },
    { id: "kaynaklar", label: "Kaynaklar" },
    ...(related.length > 0 ? [{ id: "ilgili", label: "İlişkili İçerikler" }] : []),
  ];

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
          <Badge>Algoritma</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-heading sm:text-4xl">{topic.title}</h1>
          {topic.crossCategories && topic.crossCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topic.crossCategories.map((c) => (
                <Link
                  key={c}
                  to={`/kategori/${c}`}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft hover:border-navy-500/40 hover:text-heading"
                >
                  {categoryMap[c].label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton title={topic.title} />
          <PrintButton />
          <FavoriteButton
            itemKey={`${topic.primaryCategory}/${topic.slug}`}
            title={topic.title}
            categorySlug={topic.primaryCategory}
            categoryLabel={category.label}
            kind="algorithm"
            href={href}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <section id="genel-bakis" className="scroll-anchor">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Genel Bakış</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <InfoCard label="Kategori" value={category.label} />
              <InfoCard label="Konu Türü" value="Algoritma" />
              <InfoCard label="Kullanım" value="Hızlı Referans" />
            </dl>
          </section>

          {(topic.flowCaption || topic.keyPointsCaption) && (
            <section id="gorseller" className="scroll-anchor">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Görseller</h2>
              <div className="mt-3 grid gap-6 sm:grid-cols-2">
                {topic.flowCaption && (
                  <VisualPlaceholder caption={topic.flowCaption} aspect="aspect-[3/4]" seed={topic.slug + "flow"} />
                )}
                {topic.keyPointsCaption && (
                  <VisualPlaceholder
                    caption={topic.keyPointsCaption}
                    aspect="aspect-[3/4]"
                    seed={topic.slug + "key"}
                  />
                )}
              </div>
            </section>
          )}

          <section id="adimlar" className="scroll-anchor">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">
              <ListChecks className="h-4 w-4" /> Adım Adım Yaklaşım
            </h2>
            <div className="mt-3">
              <PlaceholderNote label={site.placeholder.note} text={site.placeholder.missing} />
            </div>
          </section>

          <section id="uyarilar" className="scroll-anchor">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">
              <AlertTriangle className="h-4 w-4" /> Uyarılar ve Kritik Notlar
            </h2>
            <div className="mt-3">
              <PlaceholderNote label={site.placeholder.warning} text={site.placeholder.missing} />
            </div>
          </section>

          <section id="kaynaklar" className="scroll-anchor">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">
              <BookOpen className="h-4 w-4" /> Kaynaklar
            </h2>
            <div className="mt-3">
              <PlaceholderNote text={site.placeholder.missing} />
            </div>
          </section>

          <div id="ilgili" className="scroll-anchor">
            <RelatedContent items={related} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <TableOfContents items={toc} />
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-heading">{value}</dd>
    </div>
  );
}
