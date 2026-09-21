import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Search, Star, ChevronDown, Activity } from "lucide-react";
import { categories } from "../data/categories";
import { site } from "../data/site";
import { cn } from "../lib/cn";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-cyan-400">
            <Activity className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-extrabold tracking-tight text-heading">{site.brandLine1}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{site.brandLine2}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink to="/ekg" className={({ isActive }) => navLinkClass(isActive)}>
            EKG
          </NavLink>
          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              className={cn(navLinkClass(false), "flex items-center gap-1")}
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((v) => !v)}
            >
              Kategoriler <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {categoriesOpen && (
              <div className="reveal absolute left-1/2 top-full w-[38rem] -translate-x-1/2 pt-2">
                <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-3 shadow-[var(--shadow-card-hover)]">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/kategori/${c.slug}`}
                      className="rounded-xl px-3.5 py-2.5 hover:bg-surface-alt"
                      onClick={() => setCategoriesOpen(false)}
                    >
                      <p className="text-sm font-semibold text-heading">{c.label}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{c.description}</p>
                    </Link>
                  ))}
                </div>
                <Link
                  to="/kategoriler"
                  onClick={() => setCategoriesOpen(false)}
                  className="mt-1 block rounded-xl border border-line bg-card px-3.5 py-2.5 text-center text-sm font-semibold text-cyan-600 hover:bg-surface-alt"
                >
                  Tüm kategorileri gör →
                </Link>
              </div>
            )}
          </div>
          <NavLink to="/favoriler" className={({ isActive }) => navLinkClass(isActive)}>
            Favoriler
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-faint transition-colors hover:border-navy-500/40 hover:text-ink sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Ara</span>
            <kbd className="rounded border border-line bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
              {site.commandShortcut}
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Ara"
            className="rounded-lg border border-line p-2 text-ink-faint sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/favoriler"
            aria-label="Favoriler"
            className="rounded-lg border border-line p-2 text-ink-faint hover:text-crit-600 lg:hidden"
          >
            <Star className="h-4 w-4" />
          </Link>
          <ThemeToggle className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-faint transition-colors hover:text-heading sm:flex" />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menü"
            aria-expanded={mobileOpen}
            className="rounded-lg border border-line p-2 text-ink lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-card lg:hidden">
          <div className="container-page flex max-h-[75vh] flex-col gap-1 overflow-y-auto py-4">
            <Link to="/ekg" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt">
              EKG Kütüphanesi
            </Link>
            <Link
              to="/kategoriler"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-3 text-xs font-bold uppercase tracking-wide text-ink-faint hover:text-cyan-600"
            >
              Kategoriler
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/kategori/${c.slug}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-surface-alt"
              >
                {c.label}
              </Link>
            ))}
            <Link
              to="/favoriler"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-heading hover:bg-surface-alt"
            >
              Favoriler
            </Link>
            <div className="mt-2 flex items-center justify-between rounded-lg px-3 py-2.5">
              <span className="text-sm font-medium text-ink-soft">Görünüm</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function navLinkClass(isActive: boolean) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
    isActive ? "text-heading" : "text-ink-soft hover:text-heading",
  );
}
