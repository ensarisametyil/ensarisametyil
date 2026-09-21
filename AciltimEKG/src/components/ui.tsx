import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "../lib/cn";

export function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "cyan" | "crit" }) {
  const tones = {
    navy: "bg-navy-900/[0.06] text-navy-800",
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
        "rounded-2xl border border-line bg-white shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]",
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
      <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h2>
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

/** Placeholder visual area standing in for a real EKG strip / algorithm flow image that wasn't recovered from the source archive. */
export function VisualPlaceholder({
  caption,
  aspect = "aspect-[16/9]",
}: {
  caption: string;
  aspect?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-navy-950">
      <div className={cn("relative flex items-center justify-center", aspect)}>
        <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="120" fill="url(#grid)" />
          <path
            d="M0 60 H150 L160 60 L172 20 L184 100 L196 60 L206 60 L216 40 L226 60 H400"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
      </div>
      <figcaption className="border-t border-white/10 bg-navy-900 px-4 py-2.5 text-xs font-medium text-white/70">
        {caption}
      </figcaption>
    </figure>
  );
}
