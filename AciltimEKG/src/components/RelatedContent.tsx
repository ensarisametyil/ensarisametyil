import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { RelatedItem } from "../lib/related";

export function RelatedContent({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-cyan-600">Bununla İlgili</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3 transition-colors hover:border-navy-500/40"
          >
            <span>
              <span className="block text-sm font-semibold text-heading">{item.title}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{item.categoryLabel}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-cyan-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}
