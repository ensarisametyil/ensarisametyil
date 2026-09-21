import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, Search, FolderKanban } from "lucide-react";
import { site } from "../data/site";
import { EkgMark } from "../components/EkgMark";
import { useMeta } from "../lib/useMeta";
import type { LayoutContext } from "../layouts/RootLayout";

function NotFoundShell({ title, body, hint }: { title: string; body: string; hint?: string }) {
  useMeta(title);
  const { openSearch } = useOutletContext<LayoutContext>();

  return (
    <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <EkgMark className="h-10 w-40 text-cyan-500 opacity-70" />
      <h1 className="mt-6 text-2xl font-extrabold text-heading sm:text-3xl">{title}</h1>
      <p className="mt-3 text-base text-ink-soft">{body}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-faint">{hint}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white hover:bg-navy-800"
        >
          <ArrowLeft className="h-4 w-4" /> Ana Sayfa
        </Link>
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-ink-soft hover:border-navy-500/40 hover:text-heading"
        >
          <Search className="h-4 w-4" /> Arama
        </button>
        <Link
          to="/kategoriler"
          className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-ink-soft hover:border-navy-500/40 hover:text-heading"
        >
          <FolderKanban className="h-4 w-4" /> Kategorilere Git
        </Link>
      </div>
    </div>
  );
}

export function NotFound() {
  const { title, body, hint } = site.notFound.generic;
  return <NotFoundShell title={title} body={body} hint={hint} />;
}

export function TopicNotFound() {
  const { title, body } = site.notFound.topic;
  return <NotFoundShell title={title} body={body} />;
}

export function CategoryNotFound() {
  const { title, body } = site.notFound.category;
  return <NotFoundShell title={title} body={body} />;
}
