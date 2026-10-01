import { Lock } from "lucide-react";
import { ilaclarTopics } from "../../data/ilaclar";
import { useMeta } from "../../lib/useMeta";

export function AdminIlaclarReadOnly() {
  useMeta("İlaçlar (salt okunur)");

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading">İlaçlar</h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
        <Lock className="h-4 w-4 shrink-0" />
        Bu kategori sabit koddadır (statik veri) — buradan eklenemez, düzenlenemez, silinemez veya sıralanamaz.
      </p>
      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-card">
        {ilaclarTopics.map((topic, index) => (
          <li key={topic.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className="w-7 shrink-0 text-right text-xs font-bold text-ink-faint">{index + 1}</span>
            <img src={topic.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-heading">{topic.title}</span>
              <span className="block truncate text-xs text-ink-faint">{topic.genericName}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
