import { useEffect } from "react";

/** Lightweight per-route <title>/meta-description setter — avoids pulling in a Helmet dependency. */
export function useMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} · ACİLTİMEKG`;

    let metaEl: HTMLMetaElement | null = null;
    let prevContent: string | null = null;
    if (description) {
      metaEl = document.querySelector('meta[name="description"]');
      if (metaEl) {
        prevContent = metaEl.getAttribute("content");
        metaEl.setAttribute("content", description);
      }
    }

    return () => {
      document.title = prevTitle;
      if (metaEl && prevContent !== null) {
        metaEl.setAttribute("content", prevContent);
      }
    };
  }, [title, description]);
}
