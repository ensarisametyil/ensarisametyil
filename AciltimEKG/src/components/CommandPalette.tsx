import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CornerDownLeft, ArrowRight } from "lucide-react";
import { searchGrouped } from "../lib/search";
import { site } from "../data/site";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const groups = useMemo(() => searchGrouped(query), [query]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        if (flatItems.length === 0 && query.trim()) {
          navigate(`/arama?q=${encodeURIComponent(query.trim())}`);
          onClose();
          return;
        }
        const item = flatItems[activeIndex];
        if (item) {
          navigate(item.href);
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatItems, activeIndex, navigate, onClose, query]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label={site.quickMenuLabel}>
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
      />
      <div className="reveal relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bir konu, ilaç, ritim veya algoritma ara…"
            className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
            aria-label="Ara"
          />
          <button type="button" onClick={onClose} aria-label="Kapat" className="rounded-md p-1 text-ink-faint hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center text-sm text-ink-faint">{site.topicHeadingsLabel}</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-faint">{site.searchNoResults}</p>
          ) : (
            groups.map((group) => (
              <div key={group.kind} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  {group.label}
                </p>
                <ul>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const i = runningIndex;
                    return (
                      <li key={item.href + item.title}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => {
                            navigate(item.href);
                            onClose();
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                            i === activeIndex ? "bg-navy-900 text-white" : "text-ink hover:bg-surface-alt"
                          }`}
                        >
                          <span className="truncate font-medium">{item.title}</span>
                          <span className={`shrink-0 text-xs ${i === activeIndex ? "text-white/60" : "text-ink-faint"}`}>
                            {item.subtitle}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-surface-alt px-4 py-2 text-xs text-ink-faint">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> seç
            </span>
            <span>↑↓ gezin</span>
            <span>Esc kapat</span>
          </span>
          {query.trim() !== "" && (
            <button
              type="button"
              onClick={() => {
                navigate(`/arama?q=${encodeURIComponent(query.trim())}`);
                onClose();
              }}
              className="flex items-center gap-1 font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Gelişmiş arama <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
