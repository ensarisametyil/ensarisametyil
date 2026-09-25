import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { ekgTopics, systematicSteps } from "../data/rhythms";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { VisualPlaceholder } from "../components/ui";
import { useMeta } from "../lib/useMeta";

export function EkgHub() {
  useMeta("EKG Kütüphanesi", "Kalbin ileti sisteminden ritim bozukluklarına, sistematik sırayla 28 EKG konusu.");

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return ekgTopics;
    return ekgTopics.filter((t) => t.title.toLocaleLowerCase("tr").includes(q));
  }, [query]);

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "EKG" }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-heading sm:text-4xl">{site.ekgLibraryLabel}</h1>
          <p className="prose-medical mt-3">{site.heroLead}</p>

          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Konu ara…"
              className="w-full rounded-xl border border-line bg-card py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="mt-8">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface-alt px-5 py-10 text-center text-sm text-ink-faint">
                Aradığınız konu bulunamadı.
              </div>
            ) : (
              <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      to={`/ekg/${topic.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-cyan-500/50"
                    >
                      <div className="aspect-[4/3] bg-white">
                        <img src={topic.image} alt={topic.title} loading="lazy" className="h-full w-full object-contain" />
                      </div>
                      <div className="flex items-start gap-2.5 border-t border-line px-4 py-3">
                        <span className="mt-0.5 shrink-0 font-mono text-xs text-ink-faint">
                          {String(topic.order).padStart(2, "0")}
                        </span>
                        <p className="text-sm font-semibold text-heading">{topic.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
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
            <Link
              to={`/ekg/${ekgTopics[3]?.slug ?? ""}`}
              className="mt-4 inline-block text-sm font-semibold text-cyan-600 hover:text-cyan-700"
            >
              10 basamaklı tam yorumlama rehberi →
            </Link>
          </div>
          <div className="mt-4">
            <VisualPlaceholder caption={ekgTopics[0]?.title ?? ""} src={ekgTopics[0]?.image} aspect="aspect-[4/3]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
