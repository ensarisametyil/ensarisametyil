import { useEffect, useState } from "react";
import { List } from "lucide-react";

export interface TocItem {
  id: string;
  label: string;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="İçindekiler" className="rounded-2xl border border-line bg-card p-4">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left lg:pointer-events-none"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">
          <List className="h-3.5 w-3.5" /> İçindekiler
        </span>
      </button>
      <ul className={collapsed ? "mt-3 hidden space-y-1 lg:block" : "mt-3 space-y-1"}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                activeId === item.id ? "bg-cyan-100 font-semibold text-cyan-600" : "text-ink-soft hover:text-heading"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
