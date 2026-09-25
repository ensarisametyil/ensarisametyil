import { useState, type ReactNode } from "react";
import { AlertTriangle, Info, ZoomIn } from "lucide-react";
import { cn } from "../lib/cn";
import { ImageLightbox } from "./ImageLightbox";
import { EkgWaveformGraphic } from "./EkgWaveform";

export function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "cyan" | "crit" }) {
  const tones = {
    navy: "bg-navy-900/[0.06] text-navy-800 dark:bg-white/10 dark:text-white/80",
    cyan: "bg-cyan-100 text-cyan-600",
    crit: "bg-crit-100 text-crit-700",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-600">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-extrabold text-heading sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 text-base leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  );
}

/** Note block for the site's own "placeholder content" convention (real from source: "İçerikler yer tutucudur"). */
export function PlaceholderNote({ label = "NOT", text }: { label?: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-surface-alt px-4 py-3 text-sm text-ink-faint">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
      <p>
        <span className="mr-1.5 font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
        {text}
      </p>
    </div>
  );
}

export function CriticalNote({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-crit-600/20 bg-crit-100 px-4 py-3.5 text-sm text-crit-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{heading}</p>
        <p className="mt-1 leading-relaxed text-crit-700/90">{text}</p>
      </div>
    </div>
  );
}

/**
 * Visual area for an EKG/algorithm reference image. When `src` is given, the
 * real image (e.g. an EKG strip under /public/ekg/) is shown; otherwise a
 * decorative placeholder waveform stands in for an image that wasn't
 * recovered from the source. Click/tap opens the full viewer (zoom, pan,
 * fullscreen).
 */
export function VisualPlaceholder({
  caption,
  aspect = "aspect-[16/9]",
  expandable = true,
  seed,
  src,
}: {
  caption: string;
  aspect?: string;
  expandable?: boolean;
  seed?: string;
  src?: string;
}) {
  const [open, setOpen] = useState(false);
  const graphicSeed = seed ?? caption;

  const graphic = (fill = "h-full w-full") =>
    src ? (
      <img src={src} alt={caption} loading="lazy" className={cn(fill, "object-contain")} />
    ) : (
      <EkgWaveformGraphic seed={graphicSeed} className={fill} />
    );

  return (
    <>
      <figure className="group overflow-hidden rounded-xl border border-line bg-navy-950">
        <button
          type="button"
          disabled={!expandable}
          onClick={() => setOpen(true)}
          aria-label={expandable ? `${caption} — büyüt` : undefined}
          className={cn(
            "relative flex w-full items-center justify-center",
            aspect,
            src && "bg-white",
            expandable && "cursor-zoom-in",
          )}
        >
          {graphic()}
          {expandable && (
            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/0 opacity-0 transition-all duration-200 group-hover:bg-navy-950/30 group-hover:opacity-100">
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <ZoomIn className="h-3.5 w-3.5" /> Büyüt
              </span>
            </span>
          )}
        </button>
        <figcaption className="border-t border-white/10 bg-navy-900 px-4 py-2.5 text-xs font-medium text-white/70">
          {caption}
        </figcaption>
      </figure>
      {expandable && (
        <ImageLightbox open={open} onClose={() => setOpen(false)} caption={caption} renderGraphic={() => graphic("w-full")} />
      )}
    </>
  );
}
