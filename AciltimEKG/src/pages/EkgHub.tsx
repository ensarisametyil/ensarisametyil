import { Link } from "react-router-dom";
import { rhythmGroups, systematicSteps } from "../data/rhythms";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { VisualPlaceholder } from "../components/ui";
import { useMeta } from "../lib/useMeta";

export function EkgHub() {
  useMeta("EKG Kütüphanesi", "Sinüs, atriyal, ventriküler ritimler ve ileti bozuklukları — hızlı referans EKG kütüphanesi.");

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "EKG" }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">{site.ekgLibraryLabel}</h1>
          <p className="prose-medical mt-3">{site.heroLead}</p>

          <div className="mt-10 space-y-10">
            {rhythmGroups.map((group) => (
              <div key={group.heading}>
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">{group.heading}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/ekg/${item.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-navy-500/40 hover:bg-surface"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-navy-900">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-faint">{item.caption}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">SİSTEMATİK YAKLAŞIM</p>
            <p className="mt-2 text-sm font-semibold text-navy-900">EKG'yi Sırayla Değerlendir</p>
            <ol className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {systematicSteps.map((step, i) => (
                <li key={step.title} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900/[0.08] text-[11px] font-bold text-navy-800">
                    {i + 1}
                  </span>
                  {step.title}
                  {step.detail && <span className="text-xs text-ink-faint">· {step.detail}</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4">
            <VisualPlaceholder caption="Kalbin ileti sistemi · Anatomik gösterim" />
          </div>
        </aside>
      </div>
    </div>
  );
}
