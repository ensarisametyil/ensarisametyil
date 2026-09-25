import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, X, Eye, Pencil as PencilIcon } from "lucide-react";
import { categoryLabel, isDynamicCategory } from "../../lib/dynamicCategories";
import {
  ApiError,
  createTopic,
  getAdminTopics,
  updateTopic,
  uploadImage,
  type AdminTopic,
} from "../../lib/adminApi";
import { useMeta } from "../../lib/useMeta";
import { CriticalNote } from "../../components/ui";

export function TopicForm() {
  const { categorySlug = "", topicSlug } = useParams();
  const isEdit = Boolean(topicSlug);
  useMeta(isEdit ? "Konuyu Düzenle" : "Yeni Konu");
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existing, setExisting] = useState<AdminTopic | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !isDynamicCategory(categorySlug)) return;
    getAdminTopics(categorySlug)
      .then((topics) => {
        const found = topics.find((t) => t.slug === topicSlug);
        if (!found) {
          setNotFound(true);
          return;
        }
        setExisting(found);
        setTitle(found.title);
        setContent(found.content);
        setImageUrl(found.imageUrl);
      })
      .catch(() => setError("Konu yüklenemedi."))
      .finally(() => setLoading(false));
  }, [categorySlug, isEdit, topicSlug]);

  if (!isDynamicCategory(categorySlug)) return <Navigate to="/admin" replace />;
  if (notFound) return <Navigate to={`/admin/${categorySlug}`} replace />;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Başlık gerekli.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      if (isEdit && existing) {
        await updateTopic(existing.id, { title: title.trim(), content, imageUrl: finalImageUrl });
      } else {
        await createTopic({ categorySlug, title: title.trim(), content, imageUrl: finalImageUrl });
      }
      navigate(`/admin/${categorySlug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-faint">Yükleniyor…</p>;
  }

  const displayImage = imagePreview ?? imageUrl;

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => navigate(`/admin/${categorySlug}`)}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4" /> {categoryLabel(categorySlug)}
      </button>

      <h1 className="text-2xl font-extrabold text-heading">{isEdit ? "Konuyu Düzenle" : "Yeni Konu"}</h1>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5 rounded-2xl border border-line bg-card p-5 sm:p-6">
        {error && <CriticalNote heading="Kaydedilemedi" text={error} />}

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-heading">
            Başlık
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Adrenalin"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>

        <div>
          <span className="block text-sm font-semibold text-heading">Görsel</span>
          {displayImage ? (
            <div className="relative mt-1.5 inline-block">
              <img src={displayImage} alt="" className="h-40 w-40 rounded-xl object-cover" />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Görseli kaldır"
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-crit-600 text-white shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex h-32 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-ink-faint hover:border-navy-500/40 hover:text-ink-soft"
            >
              <ImagePlus className="h-5 w-5" /> Görsel yükle (telefon/bilgisayar)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="block text-sm font-semibold text-heading">
              İçerik
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-alt"
            >
              {showPreview ? (
                <>
                  <PencilIcon className="h-3.5 w-3.5" /> Düzenle
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" /> Önizle
                </>
              )}
            </button>
          </div>
          {showPreview ? (
            <div className="mt-1.5 min-h-[10rem] whitespace-pre-wrap rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink">
              {content || <span className="text-ink-faint">(İçerik boş)</span>}
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Konu içeriğini buraya yazın…"
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-navy-900 py-3.5 text-base font-bold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>
    </div>
  );
}
