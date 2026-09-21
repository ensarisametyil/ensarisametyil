import { useEffect } from "react";
import { useRecentlyViewed, type RecentEntry } from "../context/RecentlyViewedContext";

/** Records a "recently viewed" entry once when a detail page mounts / its key changes. */
export function useRecordView(entry: Omit<RecentEntry, "viewedAt"> | null) {
  const { recordView } = useRecentlyViewed();
  useEffect(() => {
    if (entry) recordView(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.key]);
}
