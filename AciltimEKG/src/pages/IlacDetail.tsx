import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { categoryMap } from "../data/categories";
import { ilaclarTopics, findIlacTopic } from "../data/ilaclar";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { TableOfContents, type TocItem } from "../components/TableOfContents";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { cn } from "../lib/cn";
import { TopicNotFound } from "./NotFound";

function sectionId(index: number): string {
  return `bolum-${index}`;
}

/**
 * Static counterpart of DynamicTopicDetail for the "İlaçlar" category —
 * unlike the image-only static categories (EKG, Algoritmalar), this one
 * shows structured text content (5 sabit alt başlık) mirroring EkgDetail's
 * "sections" rendering pattern, plus the source poster image as a
 * reference at the bottom. Reads from src/data/ilaclar.ts, no database.
 */
export function IlacDetail({ slug }: { slug: string }) {
  const category = categoryMap["ilaclar"];
  const topic = findIlacTopic(slug);

  useMeta(topic ? `${topic.title} (${topic.genericName})` : category.label);

  const href = `/kategori/ilaclar/${slug}`;
  useRecordView(
    topic
      ? {
          key: `ilaclar/${slug}`,
          title: topic.title,
          categorySlug: "ilaclar",
          categoryLabel: category.label,
          kind: "topic",
          href,
        }
      : null,
  );

  if (!topic) return <TopicNotFound />;

  const toc: TocItem[] = topic.sections.map((s, i) => ({ id: sectionId(i), label: s.heading }));
  const prev = ilaclarTopics[topic.order - 2];
  const next = ilaclarTopics[topic.order];

  return (
    <div className="container-page py-10 sm:py-14">
      <ScrollProgress />
      <Breadcrumbs
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: category.label, href: "/kategori/ilaclar" },
          { label: topic.title },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge>{category.label}</Badge>
              <h1 className="mt-3 text-3xl font-extrabold text-heading sm:text-4xl">{topic.title}</h1>
              <p className="mt-1.5 text-sm font-semibold text-ink-soft">
                {topic.genericName} · {topic.dose}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton title={topic.title} />
              <PrintButton />
              <FavoriteButton
                itemKey={`ilaclar/${slug}`}
                title={topic.title}
                categorySlug="ilaclar"
                categoryLabel={category.label}
                kind="topic"
                href={href}
              />
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {topic.sections.map((section, i) => (
              <section key={section.heading} id={sectionId(i)} className="scroll-anchor">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">{section.heading}</h2>
                <ul className="prose-medical mt-3 space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-2.5">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section id="kaynak-gorsel" className="scroll-anchor mt-8">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Kaynak Görsel</h2>
            <div className="mt-3 max-w-md">
              <img src={topic.image} alt={topic.title} className="w-full rounded-2xl border border-line object-cover" />
            </div>
          </section>

          <nav className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
            {prev ? (
              <Link
                to={`/kategori/ilaclar/${prev.slug}`}
                className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink-soft hover:text-heading"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={`/kategori/ilaclar/${next.slug}`}
                className={cn("flex min-w-0 items-center gap-2 text-right text-sm font-semibold text-ink-soft hover:text-heading")}
              >
                <span className="min-w-0 truncate">{next.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <TableOfContents items={toc} />
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">Konu türü</p>
            <p className="mt-1.5 text-sm font-semibold text-heading">İlaç Doz Kartı</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">Kullanım</p>
            <p className="mt-1.5 text-sm font-semibold text-heading">Hızlı Referans</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
