import { Link } from "react-router-dom";
import { FolderKanban, Pill, Activity, GitBranch, Newspaper, ArrowRight, Database, Server, ShieldCheck } from "lucide-react";
import { categories } from "../../data/categories";
import { topics } from "../../data/topics";
import { drugs } from "../../data/drugs";
import { ekgTopics } from "../../data/rhythms";

export function AdminDashboard() {
  const algorithmCount = topics.filter((t) => t.kind === "algorithm").length;
  const drugCount = drugs.length;
  const rhythmCount = ekgTopics.length;
  const articleCount = topics.filter((t) => t.kind === "article").length;
  const placeholderCount = topics.filter((t) => t.kind === "algorithm" && !t.hasDetail).length;

  const stats = [
    { label: "Kategoriler", value: categories.length, icon: FolderKanban, href: "/admin/kategoriler" },
    { label: "Algoritmalar", value: algorithmCount, icon: GitBranch, href: "/admin/algoritmalar" },
    { label: "İlaçlar", value: drugCount, icon: Pill, href: "/admin/ilaclar" },
    { label: "Ritimler", value: rhythmCount, icon: Activity, href: "/admin/ritimler" },
    { label: "Makaleler", value: articleCount, icon: Newspaper, href: "/admin/makaleler" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-heading">Dashboard</h1>
      <p className="mt-1.5 text-sm text-ink-soft">İçerik kütüphanesine genel bakış.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-navy-500/40"
          >
            <s.icon className="h-5 w-5 text-cyan-600" />
            <p className="mt-3 text-2xl font-extrabold text-heading">{s.value}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-faint">
              {s.label}
              <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-5 lg:col-span-2">
          <p className="text-sm font-bold text-heading">İçerik Durumu</p>
          <p className="mt-1 text-xs text-ink-faint">
            Kaynaktan çıkarılan gerçek verilerle dolu olan alanlar ile "içerik eksik" olarak işaretli yer tutucu
            alanların oranı.
          </p>
          <div className="mt-4 space-y-3">
            <StatusRow label="İlaç doz kartları (tam veri)" value={drugCount} total={drugCount} />
            <StatusRow
              label="Algoritma sayfaları (yer tutucu)"
              value={algorithmCount - placeholderCount}
              total={algorithmCount}
            />
            <StatusRow label="EKG ritim kütüphanesi (başlık + altyazı)" value={rhythmCount} total={rhythmCount} />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="text-sm font-bold text-heading">Gelecek Altyapı</p>
          <ul className="mt-3 space-y-3 text-sm text-ink-soft">
            <li className="flex items-start gap-2.5">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              PostgreSQL + içerik şeması (kategori → konu → detay)
            </li>
            <li className="flex items-start gap-2.5">
              <Server className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              REST/GraphQL API üzerinden içerik servisi
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
              Rol tabanlı kimlik doğrulama (editör / yönetici)
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-bold text-heading">Son Etkinlik (örnek)</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {sampleActivity.map((a) => (
            <li key={a.text} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-ink-soft">{a.text}</span>
              <span className="shrink-0 text-xs text-ink-faint">{a.time}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-faint">
          Bu liste yalnızca gelecekteki etkinlik günlüğünün nasıl görüneceğini gösterir; gerçek kayıt tutulmaz.
        </p>
      </div>
    </div>
  );
}

function StatusRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>{label}</span>
        <span>
          {value}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const sampleActivity = [
  { text: "Amiodaron doz kartı güncellendi (örnek)", time: "2 sa önce" },
  { text: "STEMI algoritma sayfası incelendi (örnek)", time: "5 sa önce" },
  { text: "Yeni kategori taslağı: Makaleler (örnek)", time: "1 gün önce" },
];
