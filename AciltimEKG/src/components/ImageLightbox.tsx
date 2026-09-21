import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X, Maximize, Minimize } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  caption: string;
  renderGraphic: () => ReactNode;
}

/**
 * Premium EKG image viewer chrome: zoom, pan/drag, fullscreen, pinch-zoom on
 * touch. It operates on the same restrained placeholder graphic used inline
 * (no real EKG imagery was recovered from the source archive — see
 * VisualPlaceholder), so the viewer demonstrates the real interaction model
 * without fabricating a medical image.
 */
export function ImageLightbox({ open, onClose, caption, renderGraphic }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchState = useRef<{ startDist: number; startScale: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.25, 4));
      else if (e.key === "-") setScale((s) => Math.max(s - 0.25, 1));
      else if (e.key === "0") {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
  }
  function onPointerUp() {
    setIsDragging(false);
    dragState.current = null;
  }

  function touchDist(t: React.TouchList) {
    const [a, b] = [t[0], t[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchState.current = { startDist: touchDist(e.touches), startScale: scale };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchState.current) {
      const dist = touchDist(e.touches);
      const next = (pinchState.current.startScale * dist) / pinchState.current.startDist;
      setScale(Math.min(Math.max(next, 1), 4));
    }
  }
  function onTouchEnd() {
    pinchState.current = null;
  }

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex flex-col bg-navy-950/96 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={caption}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate text-sm font-medium text-white/80">{caption}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s - 0.25, 1))}
            aria-label="Uzaklaştır"
            className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-mono text-white/60">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s + 0.25, 4))}
            aria-label="Yakınlaştır"
            className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            aria-label="Sıfırla"
            className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
            className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-lg border border-white/15 p-2 text-white/80 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 touch-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          <div className="w-full max-w-3xl px-6">{renderGraphic()}</div>
        </div>
      </div>

      <p className="px-4 pb-4 text-center text-xs text-white/40 sm:px-6">
        Yakınlaştır/uzaklaştır: +/− · Sıfırla: 0 · Kapat: Esc · Dokunmatikte iki parmakla yakınlaştır
      </p>
    </div>,
    document.body,
  );
}
