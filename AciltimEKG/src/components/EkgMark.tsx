interface Props {
  className?: string;
}

/** Restrained EKG waveform mark used as the site's recurring visual motif. Decorative only. */
export function EkgMark({ className }: Props) {
  return (
    <svg viewBox="0 0 200 40" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path
        className="ekg-line"
        d="M0 20 H55 L63 20 L70 6 L78 34 L85 20 L92 20 L98 12 L104 20 H200"
      />
    </svg>
  );
}
