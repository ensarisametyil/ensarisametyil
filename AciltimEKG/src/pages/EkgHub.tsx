import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { rhythmGroups, systematicSteps } from "../data/rhythms";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { VisualPlaceholder } from "../components/ui";
import { EkgWaveformGraphic } from "../components/EkgWaveform";
import { cn } from "../lib/cn";
import { useMeta } from "../lib/useMeta";

export function EkgHub() {
  useMeta("EKG Kütüphanesi", "Sinüs, atriyal, ventriküler ritimler ve ileti bozuklukları — hızlı referans EKG kütüphanesi.");

  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return rhythmGroups
      .filter((g) => !activeGroup || g.heading === activeGroup)
      .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.title.toLocaleLowerCase("tr").includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [query, activeGroup]);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "EKG" }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-heading sm:text-4xl">{site.ekgLibraryLabel}</h1>
          <p className="prose-medical mt-3">{site.heroLead}</p>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ritim ara…"
              className="w-full rounded-xl border border-line bg-card py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeGroup === null
                  ? "border-navy-900 bg-navy-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-navy-950"
                  : "border-line text-ink-soft hover:text-heading",
              )}
            >
              Tümü
            </button>
            {rhythmGroups.map((g) => (
              <button
                key={g.heading}
                type="button"
                onClick={() => setActiveGroup(g.heading)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  activeGroup === g.heading
                    ? "border-navy-900 bg-navy-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-navy-950"
                    : "border-line text-ink-soft hover:text-heading",
                )}
              >
                {g.heading}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-10">
            {filteredGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-alt px-5 py-10 text-center text-sm text-ink-faint">
                Aradığınız ritim bulunamadı.
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.heading}>
                  <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">{group.heading}</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.slug}
                        to={`/ekg/${item.slug}`}
                        className="group overflow-hidden rounded-xl border border-line bg-navy-950 transition-colors hover:border-cyan-500/50"
                      >
                        <div className="aspect-[16/10]">
                          <EkgWaveformGraphic seed={item.slug} />
                        </div>
                        <div className="border-t border-white/10 bg-navy-900 px-4 py-3">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs text-white/50">{item.caption}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">SİSTEMATİK YAKLAŞIM</p>
            <p className="mt-2 text-sm font-semibold text-heading">EKG'yi Sırayla Değerlendir</p>
            <ol className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {systematicSteps.map((step, i) => (
                <li key={step.title} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900/[0.08] text-[11px] font-bold text-navy-800 dark:bg-white/10 dark:text-white/80">
                    {i + 1}
                  </span>
                  {step.title}
                  {step.detail && <span className="text-xs text-ink-faint">· {step.detail}</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-4">
            <VisualPlaceholder caption="Kalbin ileti sistemi · Anatomik gösterim" seed="conduction-system" />
          </div>
        </aside>
      </div>
    </div>
  );
}
