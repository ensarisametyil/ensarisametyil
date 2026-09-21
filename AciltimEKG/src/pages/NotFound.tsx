import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { site } from "../data/site";
import { EkgMark } from "../components/EkgMark";
import { useMeta } from "../lib/useMeta";

function NotFoundShell({ title, body, hint }: { title: string; body: string; hint?: string }) {
  useMeta(title);
  return (
    <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <EkgMark className="h-10 w-40 text-cyan-500 opacity-70" />
      <h1 className="mt-6 text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
      <p className="mt-3 text-base text-ink-soft">{body}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-ink-faint">{hint}</p>}
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-bold text-white hover:bg-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Hızlı referans merkezine dön
      </Link>
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
