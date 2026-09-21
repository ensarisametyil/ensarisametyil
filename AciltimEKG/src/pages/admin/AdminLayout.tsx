import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Pill,
  Activity,
  GitBranch,
  Newspaper,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useMeta } from "../../lib/useMeta";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/icerikler", label: "İçerikler", icon: Layers, end: true },
  { to: "/admin/kategoriler", label: "Kategoriler", icon: FolderKanban, end: true },
  { to: "/admin/ilaclar", label: "İlaçlar", icon: Pill, end: true },
  { to: "/admin/ritimler", label: "Ritimler", icon: Activity, end: true },
  { to: "/admin/algoritmalar", label: "Algoritmalar", icon: GitBranch, end: true },
  { to: "/admin/makaleler", label: "Makaleler", icon: Newspaper, end: true },
];

export function AdminLayout() {
  useMeta("Yönetim Paneli (Demo)");

  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-card lg:block">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-cyan-400">
            <Activity className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="leading-none">
            <p className="text-xs font-extrabold tracking-tight text-heading">ACİLTİMEKG</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Yönetim Paneli</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-navy-900 text-white" : "text-ink-soft hover:bg-surface-alt hover:text-heading",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 px-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-faint hover:bg-surface-alt hover:text-heading"
          >
            <ArrowLeft className="h-4 w-4" /> Siteye dön
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-amber-600/30 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-700 sm:px-6">
          Demo modu — bu panel yalnızca arayüz önizlemesidir. Gerçek kimlik doğrulama, veritabanı veya kaydetme
          işlemi yoktur.
        </div>
        <header className="flex h-14 items-center justify-between border-b border-line bg-card px-4 sm:px-6 lg:hidden">
          <Link to="/admin" className="text-sm font-extrabold text-heading">
            ACİLTİMEKG · Admin
          </Link>
          <Link to="/" className="text-xs font-semibold text-ink-faint">
            Siteye dön
          </Link>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-card px-3 py-2 lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  isActive ? "bg-navy-900 text-white" : "text-ink-soft",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
