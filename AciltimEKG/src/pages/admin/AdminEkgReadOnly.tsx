import { Lock } from "lucide-react";
import { ekgTopics } from "../../data/rhythms";
import { useMeta } from "../../lib/useMeta";

export function AdminEkgReadOnly() {
  useMeta("EKG Ritimleri (salt okunur)");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading">EKG Ritimleri</h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
        <Lock className="h-4 w-4 shrink-0" />
        Bu içerikler şimdilik salt okunur. Düzenleme desteği ileride eklenecektir.
      </p>

      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-card">
        {ekgTopics.map((topic, index) => (
          <li key={topic.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className="w-7 shrink-0 text-right text-xs font-bold text-ink-faint">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">{topic.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
