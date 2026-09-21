import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { categories } from "../data/categories";
import { site } from "../data/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-navy-950 text-white/70">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-cyan-400">
              <Activity className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[13px] font-extrabold tracking-tight text-white">{site.brandLine1}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">{site.brandLine2}</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{site.emotionalLine}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-white/40">{site.instructor}</p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Kategoriler</p>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link to={`/kategori/${c.slug}`} className="text-white/70 hover:text-cyan-400">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">&nbsp;</p>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(5).map((c) => (
              <li key={c.slug}>
                <Link to={`/kategori/${c.slug}`} className="text-white/70 hover:text-cyan-400">
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/ekg" className="text-white/70 hover:text-cyan-400">
                EKG Kütüphanesi
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">{site.audience}</p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{site.heroLead}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-5 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>{site.quickRefVersion}</p>
          <p>{site.workspaceLabel} · {site.instructor}</p>
        </div>
      </div>
    </footer>
  );
}
