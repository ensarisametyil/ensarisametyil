import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { categories, categoryMap } from "../../data/categories";
import { topics } from "../../data/topics";
import { drugs } from "../../data/drugs";
import { allRhythms, rhythmGroups } from "../../data/rhythms";

type Kind = "all" | "category" | "drug" | "rhythm" | "algorithm" | "article";

interface Row {
  title: string;
  category: string;
  status: "Yayında" | "Taslak";
}

const titles: Record<Kind, string> = {
  all: "Tüm İçerikler",
  category: "Kategoriler",
  drug: "İlaçlar",
  rhythm: "Ritimler",
  algorithm: "Algoritmalar",
  article: "Makaleler",
};

function buildRows(kind: Kind): Row[] {
  const categoryRows: Row[] = categories.map((c) => ({ title: c.label, category: "Kategori", status: "Yayında" }));
  const drugRows: Row[] = drugs.map((d) => ({ title: d.name, category: "İlaçlar", status: "Yayında" }));
  const rhythmRows: Row[] = allRhythms.map((r) => {
    const group = rhythmGroups.find((g) => g.items.some((i) => i.slug === r.slug));
    return { title: r.title, category: group?.heading ?? "EKG", status: "Yayında" };
  });
  const algorithmRows: Row[] = topics
    .filter((t) => t.kind === "algorithm")
    .map((t) => ({
      title: t.title,
      category: categoryMap[t.primaryCategory].label,
      status: t.hasDetail ? "Yayında" : "Taslak",
    }));
  const articleRows: Row[] = topics
    .filter((t) => t.kind === "article")
    .map((t) => ({ title: t.title, category: categoryMap[t.primaryCategory].label, status: "Taslak" }));

  switch (kind) {
    case "category":
      return categoryRows;
    case "drug":
      return drugRows;
    case "rhythm":
      return rhythmRows;
    case "algorithm":
      return algorithmRows;
    case "article":
      return articleRows;
    default:
      return [...categoryRows, ...drugRows, ...rhythmRows, ...algorithmRows, ...articleRows];
  }
}

export function AdminList({ kind }: { kind: Kind }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => buildRows(kind), [kind]);
  const filtered = rows.filter((r) => r.title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">{titles[kind]}</h1>
          <p className="mt-1 text-sm text-ink-soft">{filtered.length} kayıt</p>
        </div>
        <button
          type="button"
          disabled
          title="Demo modunda devre dışı"
          className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white opacity-50"
        >
          <Plus className="h-4 w-4" /> Yeni Ekle
        </button>
      </div>

      <div className="relative mt-5 max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Listede ara…"
          className="w-full rounded-lg border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">Kayıt bulunamadı.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Başlık</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((row) => (
                <tr key={row.title + row.category}>
                  <td className="px-5 py-3 font-medium text-heading">{row.title}</td>
                  <td className="px-5 py-3 text-ink-soft">{row.category}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        row.status === "Yayında"
                          ? "rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-600"
                          : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled
                        title="Demo modunda devre dışı"
                        className="cursor-not-allowed rounded-lg p-2 text-ink-faint opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Demo modunda devre dışı"
                        className="cursor-not-allowed rounded-lg p-2 text-ink-faint opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
