/** Deterministic pseudo-random EKG-like waveform path, varied by a text seed so placeholder graphics don't look identical everywhere. Decorative only — not a rendering of any real tracing. */
function seededPath(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = (n: number) => ((h = (h * 1103515245 + 12345) >>> 0), (h >> 8) % n);
  const peak = 30 + rand(50);
  const dip = 80 + rand(20);
  const notch = 8 + rand(14);
  return `M0 60 H150 L160 60 L${168 + rand(8)} ${60 - peak} L${180 + rand(8)} ${dip} L196 60 L206 60 L216 ${60 - notch} L226 60 H400`;
}

export function EkgWaveformGraphic({ seed, className = "h-full w-full" }: { seed: string; className?: string }) {
  return (
    <svg viewBox="0 0 400 120" className={className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={`grid-${seed}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(34,211,238,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="120" fill={`url(#grid-${seed})`} />
      <path
        d={seededPath(seed)}
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
