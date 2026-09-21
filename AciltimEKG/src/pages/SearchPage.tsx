import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import { searchableItems, matchesQuery, kindLabels, type SearchKind, type SearchItem } from "../lib/search";
import type { CategorySlug } from "../data/categories";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { useMeta } from "../lib/useMeta";
import { cn } from "../lib/cn";

type FilterValue = "all" | SearchKind | CategorySlug;

const filters: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "algorithm", label: "Algoritmalar" },
  { value: "drug", label: "İlaçlar" },
  { value: "rhythm", label: "Ritimler" },
  { value: "kardiyoloji", label: "Kardiyoloji" },
  { value: "travma", label: "Travma" },
  { value: "toksikoloji", label: "Toksikoloji" },
  { value: "article", label: "Makaleler" },
];

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLocaleLowerCase("tr").indexOf(query.trim().toLocaleLowerCase("tr"));
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-cyan-100 px-0.5 text-cyan-700 dark:text-cyan-100">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

function matchesFilter(item: SearchItem, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "algorithm" || filter === "drug" || filter === "rhythm" || filter === "article") {
    return item.kind === filter;
  }
  return item.categorySlug === filter;
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [filter, setFilter] = useState<FilterValue>("all");

  useMeta("Arama", "ACİLTİMEKG içinde algoritma, ilaç, ritim, kategori ve makale ara.");

  const results = useMemo(
    () => searchableItems.filter((item) => matchesQuery(item, query) && matchesFilter(item, filter)),
    [query, filter],
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs items={[{ label: "Ana Sayfa", href: "/" }, { label: "Arama" }]} />

      <h1 className="mt-6 text-3xl font-extrabold text-heading sm:text-4xl">Arama</h1>

      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Bir konu, ilaç, ritim veya algoritma ara…"
          className="w-full rounded-xl border border-line bg-card py-3.5 pl-12 pr-4 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f.value
                ? "border-navy-900 bg-navy-900 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-navy-950"
                : "border-line text-ink-soft hover:border-navy-500/40 hover:text-heading",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-ink-faint">
        {query.trim() ? `${results.length} sonuç` : `${results.length} içerik listeleniyor`}
      </p>

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-surface-alt px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink-soft">Aradığınız içerik bulunamadı.</p>
          <p className="mt-1 text-xs text-ink-faint">Farklı bir terim deneyin veya filtreleri temizleyin.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {results.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-card px-5 py-4 transition-colors hover:border-navy-500/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">
                      {kindLabels[item.kind]}
                    </span>
                    <span className="text-xs text-ink-faint">· {item.subtitle}</span>
                  </div>
                  <p className="mt-1 truncate text-base font-semibold text-heading">{highlight(item.title, query)}</p>
                  {item.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-ink-faint">{item.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-cyan-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
