import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, RefreshCcw } from "lucide-react";
import { ekgTopics } from "../../data/rhythms";
import { getCategories, type AdminCategory } from "../../lib/adminApi";
import { CriticalNote } from "../../components/ui";

export function AdminDashboard() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    getCategories()
      .then(setCategories)
      .catch(() => setError("Kategoriler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Panel</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Bir kategori seçerek konuları düzenleyin.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-alt"
        >
          <RefreshCcw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <CriticalNote heading="Yükleme hatası" text={error} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(categories ?? []).map((c) => (
          <Link
            key={c.slug}
            to={`/admin/${c.slug}`}
            className="group rounded-2xl border border-line bg-card p-5 transition-colors hover:border-navy-500/40"
          >
            <p className="text-3xl font-extrabold text-heading">{c.count}</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-ink-soft">
              {c.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </Link>
        ))}

        {categories === null && !error && (
          <p className="text-sm text-ink-faint">Yükleniyor…</p>
        )}

        <Link
          to="/admin/ekg"
          className="group rounded-2xl border border-dashed border-line bg-card p-5 transition-colors hover:border-navy-500/40"
        >
          <p className="text-3xl font-extrabold text-heading">{ekgTopics.length}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <Lock className="h-3.5 w-3.5 shrink-0" /> EKG Ritimleri (salt okunur)
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-5">
        <p className="text-sm font-bold text-heading">Nasıl çalışır?</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Bir kategori kartına dokunun, konu ekleyin/düzenleyin/silin, sırasını değiştirin.</li>
          <li>Yaptığınız her değişiklik, kaydettiğiniz anda siteye yansır — yeniden yayınlama gerekmez.</li>
          <li>EKG içerikleri şimdilik yalnızca görüntülenebilir; düzenleme desteği ileride eklenecektir.</li>
        </ul>
      </div>
    </div>
  );
}
