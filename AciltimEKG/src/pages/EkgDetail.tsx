import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ekgTopics, findEkgTopic } from "../data/rhythms";
import { site } from "../data/site";
import { relatedForRhythm } from "../lib/related";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { RelatedContent } from "../components/RelatedContent";
import { TableOfContents, type TocItem } from "../components/TableOfContents";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge, VisualPlaceholder } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { cn } from "../lib/cn";
import { TopicNotFound } from "./NotFound";

function sectionId(index: number): string {
  return `bolum-${index}`;
}

export function EkgDetail() {
  const { slug = "" } = useParams();
  const topic = findEkgTopic(slug);

  useMeta(topic ? topic.title : site.notFound.topic.title, topic?.definition);
  useRecordView(
    topic
      ? { key: `ekg/${topic.slug}`, title: topic.title, categorySlug: "ekg", categoryLabel: "EKG", kind: "rhythm", href: `/ekg/${topic.slug}` }
      : null,
  );

  if (!topic) return <TopicNotFound />;

  const related = relatedForRhythm(topic.slug);
  const toc: TocItem[] = [
    { id: "tanim", label: "Tanım" },
    ...topic.sections.map((s, i) => ({ id: sectionId(i), label: s.heading })),
    ...(topic.clinicalNote ? [{ id: "klinik-onem", label: "Klinik Önem" }] : []),
    ...(related.length > 0 ? [{ id: "ilgili", label: "İlişkili Konular" }] : []),
  ];

  const prev = ekgTopics[topic.order - 2];
  const next = ekgTopics[topic.order];

  return (
    <div className="container-page py-10 sm:py-14">
      <ScrollProgress />
      <Breadcrumbs
        items={[{ label: "Ana Sayfa", href: "/" }, { label: "EKG", href: "/ekg" }, { label: topic.title }]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge>Konu {String(topic.order).padStart(2, "0")} / 28</Badge>
              <h1 className="mt-3 text-3xl font-extrabold text-heading sm:text-4xl">{topic.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ShareButton title={topic.title} />
              <PrintButton />
              <FavoriteButton
                itemKey={`ekg/${topic.slug}`}
                title={topic.title}
                categorySlug="ekg"
                categoryLabel="EKG"
                kind="rhythm"
                href={`/ekg/${topic.slug}`}
              />
            </div>
          </div>

          <div className="mt-8">
            <VisualPlaceholder caption={topic.title} src={topic.image} aspect="aspect-[4/3]" seed={topic.slug} />
          </div>

          <section id="tanim" className="scroll-anchor prose-medical mt-8">
            <p>{topic.definition}</p>
          </section>

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

          {topic.clinicalNote && (
            <section id="klinik-onem" className="scroll-anchor mt-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Klinik Önem</h2>
              <p className="prose-medical mt-3">{topic.clinicalNote}</p>
            </section>
          )}

          <div id="ilgili" className="scroll-anchor">
            <RelatedContent items={related} />
          </div>

          <nav className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
            {prev ? (
              <Link
                to={`/ekg/${prev.slug}`}
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
                to={`/ekg/${next.slug}`}
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
            <p className="mt-1.5 text-sm font-semibold text-heading">EKG Eğitimi</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">Kullanım</p>
            <p className="mt-1.5 text-sm font-semibold text-heading">Hızlı Referans</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
