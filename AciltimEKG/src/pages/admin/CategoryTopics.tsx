import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, ImageOff } from "lucide-react";
import { categoryLabel, isDynamicCategory } from "../../lib/dynamicCategories";
import { deleteTopic, getAdminTopics, reorderTopics, type AdminTopic } from "../../lib/adminApi";
import { useMeta } from "../../lib/useMeta";
import { CriticalNote } from "../../components/ui";

export function CategoryTopics() {
  const { categorySlug = "" } = useParams();
  useMeta(categoryLabel(categorySlug));
  const [topics, setTopics] = useState<AdminTopic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!isDynamicCategory(categorySlug)) return;
    setError(null);
    getAdminTopics(categorySlug)
      .then(setTopics)
      .catch(() => setError("Konular yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin."));
  }, [categorySlug]);

  useEffect(load, [load]);

  if (!isDynamicCategory(categorySlug)) return <Navigate to="/admin" replace />;

  async function move(index: number, direction: -1 | 1) {
    if (!topics) return;
    const target = index + direction;
    if (target < 0 || target >= topics.length) return;

    const reordered = [...topics];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setTopics(reordered);
    setBusyId(reordered[index].id);
    try {
      await reorderTopics(categorySlug, reordered.map((t) => t.id));
      setTopics(reordered.map((t, i) => ({ ...t, order: i })));
    } catch {
      setError("Sıralama kaydedilemedi. Sayfa yenilenip tekrar denenecek.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(topic: AdminTopic) {
    if (!window.confirm(`"${topic.title}" konusunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }
    setBusyId(topic.id);
    try {
      await deleteTopic(topic.id);
      setTopics((prev) => (prev ?? []).filter((t) => t.id !== topic.id));
    } catch {
      setError("Konu silinemedi. Lütfen tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">{categoryLabel(categorySlug)}</h1>
          <p className="mt-1 text-sm text-ink-soft">{topics ? `${topics.length} konu` : "Yükleniyor…"}</p>
        </div>
        <Link
          to={`/admin/${categorySlug}/yeni`}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-3 text-sm font-bold text-white hover:bg-navy-800"
        >
          <Plus className="h-4 w-4" /> Yeni Konu Ekle
        </Link>
      </div>

      {error && (
        <div className="mt-4">
          <CriticalNote heading="Bir sorun oluştu" text={error} />
        </div>
      )}

      {topics && topics.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-card px-5 py-10 text-center text-sm text-ink-faint">
          Bu kategoride henüz konu yok. "Yeni Konu Ekle" ile başlayın.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {(topics ?? []).map((topic, index) => (
          <li
            key={topic.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 sm:p-4"
          >
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                disabled={index === 0 || busyId !== null}
                onClick={() => move(index, -1)}
                aria-label="Yukarı taşı"
                className="rounded-md border border-line p-1.5 text-ink-soft hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={index === topics!.length - 1 || busyId !== null}
                onClick={() => move(index, 1)}
                aria-label="Aşağı taşı"
                className="rounded-md border border-line p-1.5 text-ink-soft hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt">
              {topic.imageUrl ? (
                <img src={topic.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-5 w-5 text-ink-faint" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-heading">{topic.title}</p>
              <p className="truncate text-xs text-ink-faint">Sıra: {topic.order + 1}</p>
            </div>

            <div className="flex shrink-0 gap-1.5">
              <Link
                to={`/admin/${categorySlug}/${topic.slug}/duzenle`}
                aria-label="Düzenle"
                className="rounded-lg p-2.5 text-ink-soft hover:bg-surface-alt hover:text-heading"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handleDelete(topic)}
                aria-label="Sil"
                className="rounded-lg p-2.5 text-crit-600 hover:bg-crit-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
