import type { DrugProfile } from "../data/drugs";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { Badge, CriticalNote, PlaceholderNote, VisualPlaceholder } from "../components/ui";

export function DrugDetail({ drug, categoryLabel }: { drug: DrugProfile; categoryLabel: string }) {
  return (
    <div className="container-page py-10 sm:py-14">
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
          <h1 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            {drug.name}
          </h1>
        </div>
        <FavoriteButton
          itemKey={`ilaclar/${drug.slug}`}
          title={drug.name}
          categorySlug="ilaclar"
          categoryLabel={categoryLabel}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <VisualPlaceholder caption={drug.formCaption} aspect="aspect-[16/9]" />

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Farmakokinetik</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {drug.timing.map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">{t.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Kullanım Alanları</h2>
            <div className="mt-3 space-y-2">
              {drug.indications.map((ind, i) =>
                ind.placeholder ? (
                  <PlaceholderNote key={i} label={ind.context} text={site.placeholder.missing} />
                ) : (
                  <div key={i} className="rounded-xl border border-line bg-white p-4">
                    <p className="text-sm font-semibold text-navy-900">{ind.context}</p>
                    {ind.note && <p className="mt-1 text-sm text-ink-soft">{ind.note}</p>}
                  </div>
                ),
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Doz Basamakları</h2>
            <div className="mt-3 space-y-5">
              {drug.doseGroups.map((group) => (
                <div key={group.heading} className="overflow-hidden rounded-xl border border-line bg-white">
                  <div className="border-b border-line bg-surface px-4 py-2.5">
                    <p className="text-sm font-bold text-navy-900">{group.heading}</p>
                    {group.subheading && <p className="text-xs text-ink-faint">{group.subheading}</p>}
                  </div>
                  {group.steps.some((s) => s.placeholder) && group.steps.length === 1 ? (
                    <div className="p-4">
                      <PlaceholderNote text={site.placeholder.missing} />
                    </div>
                  ) : (
                    <ul className="divide-y divide-line">
                      {group.steps.map((step, i) => (
                        <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                          <span className="text-sm text-ink-soft">{step.label}</span>
                          <span className="text-right">
                            <span className="block text-sm font-bold text-navy-900">{step.value}</span>
                            {step.note && <span className="text-xs text-ink-faint">{step.note}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Olası Yan Etkiler</h2>
            <div className="mt-3 space-y-2">
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
          </section>

          <section className="space-y-3">
            {drug.criticalNotes.map((n, i) => (
              <CriticalNote key={i} heading={n.heading} text={n.text} />
            ))}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {drug.usageNote && (
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">{site.placeholder.note}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{drug.usageNote}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
