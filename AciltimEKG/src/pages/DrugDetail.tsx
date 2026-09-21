import type { DrugProfile } from "../data/drugs";
import { site } from "../data/site";
import { relatedForDrug } from "../lib/related";
import { useRecordView } from "../lib/useRecordView";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { ShareButton, PrintButton } from "../components/ActionButtons";
import { TableOfContents, type TocItem } from "../components/TableOfContents";
import { RelatedContent } from "../components/RelatedContent";
import { ScrollProgress } from "../components/ScrollProgress";
import { Badge, CriticalNote, PlaceholderNote, VisualPlaceholder } from "../components/ui";

const toc: TocItem[] = [
  { id: "genel-bilgi", label: "Genel Bilgi" },
  { id: "endikasyon", label: "Endikasyon" },
  { id: "kontrendikasyon", label: "Kontrendikasyon" },
  { id: "doz", label: "Doz" },
  { id: "uygulama", label: "Uygulama" },
  { id: "onemli-notlar", label: "Önemli Notlar" },
  { id: "ilgili", label: "İlişkili Algoritmalar" },
];

export function DrugDetail({ drug, categoryLabel }: { drug: DrugProfile; categoryLabel: string }) {
  const href = `/kategori/ilaclar/${drug.slug}`;
  useRecordView({ key: `ilaclar/${drug.slug}`, title: drug.name, categorySlug: "ilaclar", categoryLabel, kind: "drug", href });
  const related = relatedForDrug(drug.slug, drug.relatedCategorySlugs);

  return (
    <div className="container-page py-10 sm:py-14">
      <ScrollProgress />
      <Breadcrumbs
        items={[
          { label: "Ana Sayfa", href: "/" },
          { label: categoryLabel, href: "/kategori/ilaclar" },
          { label: drug.name },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="crit">İlaç Kartı</Badge>
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-heading sm:text-4xl">
            {drug.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton title={drug.name} />
          <PrintButton />
          <FavoriteButton
            itemKey={`ilaclar/${drug.slug}`}
            title={drug.name}
            categorySlug="ilaclar"
            categoryLabel={categoryLabel}
            kind="drug"
            href={href}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <section id="genel-bilgi" className="scroll-anchor space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Genel Bilgi</h2>
            <VisualPlaceholder caption={drug.formCaption} aspect="aspect-[16/9]" seed={drug.slug} />
            <dl className="grid gap-3 sm:grid-cols-2">
              {drug.timing.map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-heading">{t.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="endikasyon" className="scroll-anchor">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Endikasyon</h2>
            <div className="mt-3 space-y-2">
              {drug.indications.map((ind, i) =>
                ind.placeholder ? (
                  <PlaceholderNote key={i} label={ind.context} text={site.placeholder.missing} />
                ) : (
                  <div key={i} className="rounded-xl border border-line bg-card p-4">
                    <p className="text-sm font-semibold text-heading">{ind.context}</p>
                    {ind.note && <p className="mt-1 text-sm text-ink-soft">{ind.note}</p>}
                  </div>
                ),
              )}
            </div>
          </section>

          <section id="kontrendikasyon" className="scroll-anchor">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Kontrendikasyon</h2>
            <div className="mt-3">
              <PlaceholderNote text={site.placeholder.missing} />
            </div>
          </section>

          <section id="doz" className="scroll-anchor">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Doz</h2>
            <div className="mt-3 space-y-5">
              {drug.doseGroups.map((group) => (
                <div key={group.heading} className="overflow-hidden rounded-xl border border-line bg-card">
                  <div className="border-b border-line bg-surface px-4 py-2.5">
                    <p className="text-sm font-bold text-heading">{group.heading}</p>
                    {group.subheading && <p className="text-xs text-ink-faint">{group.subheading}</p>}
                  </div>
                  {group.steps.some((s) => s.placeholder) && group.steps.length === 1 ? (
                    <div className="p-4">
                      <PlaceholderNote text={site.placeholder.missing} />
                    </div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-line">
                        {group.steps.map((step, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 text-ink-soft">{step.label}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="block text-sm font-bold text-heading">{step.value}</span>
                              {step.note && <span className="text-xs text-ink-faint">{step.note}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section id="uygulama" className="scroll-anchor">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Uygulama</h2>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="text-sm font-semibold text-heading">{drug.formCaption}</p>
              </div>
              {drug.usageNote ? (
                <p className="prose-medical">{drug.usageNote}</p>
              ) : (
                <PlaceholderNote text={site.placeholder.missing} />
              )}
            </div>
          </section>

          <section id="onemli-notlar" className="scroll-anchor space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Önemli Notlar</h2>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Olası Yan Etkiler</p>
              <div className="space-y-2">
                {drug.sideEffects.map((s, i) =>
                  s.placeholder ? (
                    <PlaceholderNote key={i} text={site.placeholder.missing} />
                  ) : (
                    <p key={i} className="prose-medical">
                      {s.text}
                    </p>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-3">
              {drug.criticalNotes.map((n, i) => (
                <CriticalNote key={i} heading={n.heading} text={n.text} />
              ))}
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
