import { useParams } from "react-router-dom";
import { findRhythm } from "../data/rhythms";
import { site } from "../data/site";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FavoriteButton } from "../components/FavoriteButton";
import { PlaceholderNote, VisualPlaceholder } from "../components/ui";
import { useMeta } from "../lib/useMeta";
import { TopicNotFound } from "./NotFound";

export function EkgDetail() {
  const { slug = "" } = useParams();
  const rhythm = findRhythm(slug);

  useMeta(rhythm ? rhythm.title : site.notFound.topic.title);

  if (!rhythm) return <TopicNotFound />;

  return (
    <div className="container-page py-10 sm:py-14">
      <Breadcrumbs
        items={[{ label: "Ana Sayfa", href: "/" }, { label: "EKG", href: "/ekg" }, { label: rhythm.title }]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">{rhythm.title}</h1>
            <FavoriteButton
              itemKey={`ekg/${rhythm.slug}`}
              title={rhythm.title}
              categorySlug="ekg"
              categoryLabel="EKG"
            />
          </div>

          <div className="mt-8">
            <VisualPlaceholder caption={rhythm.caption} aspect="aspect-[16/10]" />
          </div>

          <div className="prose-medical mt-8">
            <PlaceholderNote label={site.placeholder.note} text={site.placeholder.missing} />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">Konu türü</p>
            <p className="mt-1.5 text-sm font-semibold text-navy-900">EKG Eğitimi</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-cyan-600">Kullanım</p>
            <p className="mt-1.5 text-sm font-semibold text-navy-900">Hızlı Referans</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
