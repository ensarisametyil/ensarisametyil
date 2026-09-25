import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, Search, HeartPulse, History, Activity, Clock } from "lucide-react";
import { site } from "../data/site";
import { systematicSteps, ekgTopics } from "../data/rhythms";
import { itemsForCategory } from "../lib/categoryItems";
import { useRecentlyViewed } from "../context/RecentlyViewedContext";
import { EkgMark } from "../components/EkgMark";
import { Card, VisualPlaceholder } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import type { LayoutContext } from "../layouts/RootLayout";

// "Bilgi Alanları" — sadece bu 7 kart, bu sırayla. Diğer kategoriler
// (Kardiyoloji, Travma, Ritimler) bu bölümde gösterilmez.
interface InfoAreaCard {
  label: string;
  href: string;
  count: number;
  description?: string;
}

const infoAreaCards: InfoAreaCard[] = [
  {
    label: "EKG",
    href: "/ekg",
    count: ekgTopics.length,
    description: "Sistematik EKG yorumlama, ritim kütüphanesi ve kalibrasyon rehberi.",
  },
  { label: "Yetişkin Algoritmalar", href: "/kategori/acil-yaklasimlar", count: itemsForCategory("acil-yaklasimlar").length },
  { label: "Pediatri Algoritmalar", href: "/kategori/pediatri", count: itemsForCategory("pediatri").length },
  { label: "Doğum ve Yenidoğan", href: "/kategori/dogum-ve-yenidogan", count: itemsForCategory("dogum-ve-yenidogan").length },
  { label: "İlaçlar", href: "/kategori/ilaclar", count: itemsForCategory("ilaclar").length },
  { label: "Toksikoloji", href: "/kategori/toksikoloji", count: itemsForCategory("toksikoloji").length },
  { label: "Makaleler", href: "/kategori/makaleler", count: itemsForCategory("makaleler").length },
];

export function Home() {
  useMeta(
    "Hastane Öncesi Acil Tıp ve EKG Hızlı Referansı",
    "Hastane öncesi EKG, acil tıp algoritmaları, ilaç dozları ve ritim kütüphanesi — tek bir hızlı referans platformunda.",
  );
  const { openSearch } = useOutletContext<LayoutContext>();
  const { recent } = useRecentlyViewed();

  return (
    <>
      {/* Hero / control center */}
      <section className="relative overflow-hidden border-b border-line bg-navy-950">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
          <EkgMark className="absolute -left-6 top-10 h-16 w-[140%] text-cyan-400" />
          <EkgMark className="absolute -left-10 bottom-8 h-20 w-[150%] rotate-180 text-crit-500 opacity-40" />
        </div>
        <div className="container-page relative py-16 sm:py-24">
          <div className="reveal max-w-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
              {site.instructor} · {site.audience}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
              {site.heroKicker}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{site.heroLead}</p>

            <button
              type="button"
              onClick={openSearch}
              className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-left text-white/50 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/10"
            >
              <Search className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-sm">Bir konu, ilaç, ritim veya algoritma ara…</span>
              <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                {site.commandShortcut}
              </kbd>
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {infoAreaCards.map((c) => (
                <Link
                  key={c.href}
                  to={c.href}
                  className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-cyan-400/50 hover:text-white"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recently viewed */}
      {recent.length > 0 && (
        <section id="recently-viewed-rail" className="border-b border-line bg-surface-alt py-8">
          <div className="container-page">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
              <History className="h-3.5 w-3.5" /> Son Görüntülediklerin
            </p>
            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {recent.slice(0, 8).map((r) => (
                <Link
                  key={r.key}
                  to={r.href}
                  className="flex w-56 shrink-0 flex-col gap-1 rounded-xl border border-line bg-card p-4 transition-colors hover:border-navy-500/40"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-600">
                    {r.categoryLabel}
                  </span>
                  <span className="truncate text-sm font-semibold text-heading">{r.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Critical / frequently used — currently the EKG library, the only category with published content */}
      <section className="container-page py-16 sm:py-20">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-600">Kritik · Sık Kullanılanlar</p>
        <h2 className="text-2xl font-extrabold text-heading sm:text-3xl">Başlangıç Noktası</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ekgTopics.slice(0, 6).map((t) => (
            <Link key={t.slug} to={`/ekg/${t.slug}`}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900/[0.06] text-navy-800 dark:bg-white/10 dark:text-white/80">
                  <Activity className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-heading">{t.title}</p>
                  <p className="mt-0.5 text-sm text-ink-faint">EKG</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Bilgi Alanları / Konu Başlıkları — sadece 7 sabit kart */}
      <section className="container-page pb-16 sm:pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-600">{site.infoAreasLabel}</p>
            <h2 className="text-2xl font-extrabold text-heading sm:text-3xl">Konu Başlıkları</h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {infoAreaCards.map((c, i) => {
            const isEmpty = c.count === 0;
            return (
              <Link key={c.href} to={c.href} className="group">
                <Card className="flex h-full flex-col justify-between p-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-base font-bold text-heading">{c.label}</p>
                    {isEmpty ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-faint">
                        <Clock className="h-3.5 w-3.5" /> İçerik hazırlanıyor
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{c.description}</p>
                    )}
                  </div>
                  <span className="mt-5 flex items-center justify-between text-sm font-semibold">
                    <span className="text-ink-faint">{c.count} hızlı referans konusu</span>
                    <ArrowRight className="h-3.5 w-3.5 text-cyan-600 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Systematic EKG approach */}
      <section className="border-y border-line bg-card py-16 sm:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-600">SİSTEMATİK YAKLAŞIM</p>
            <h2 className="text-2xl font-extrabold text-heading sm:text-3xl">EKG'yi Sırayla Değerlendir</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-ink-soft">EKG yorumlama.</p>
            <ol className="mt-8 space-y-3">
              {systematicSteps.map((step, i) => (
                <li key={step.title} className="flex items-start gap-4 rounded-xl border border-line bg-surface p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-cyan-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-heading">{step.title}</p>
                    {step.detail && <p className="mt-0.5 text-sm text-ink-faint">{step.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <Link
              to="/ekg"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-heading hover:text-cyan-600"
            >
              EKG yorumlama kütüphanesine git <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4">
            <VisualPlaceholder caption="Kalbin ileti sistemi · Anatomik gösterim" seed="conduction-home" />
            <VisualPlaceholder
              caption="12 derivasyonlu EKG · Kalbi tüm açılardan değerlendirme"
              aspect="aspect-[21/9]"
              seed="12-lead-home"
            />
          </div>
        </div>
      </section>

      {/* Emotional line */}
      <section className="border-t border-line bg-navy-900 py-14">
        <div className="container-page flex flex-col items-center gap-3 text-center">
          <HeartPulse className="h-6 w-6 text-crit-500" />
          <p className="max-w-xl text-lg font-semibold text-white">{site.emotionalLine}</p>
        </div>
      </section>
    </>
  );
}
