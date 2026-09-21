import { useState } from "react";
import { Share2, Printer, Check, Link2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} · ACİLTİMEKG`, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — nothing more we can do in a demo without a backend share endpoint.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="no-print flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-navy-500/40 hover:text-heading"
    >
      {copied ? <Check className="h-4 w-4 text-cyan-600" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Bağlantı kopyalandı" : "Paylaş"}
    </button>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-navy-500/40 hover:text-heading"
    >
      <Printer className="h-4 w-4" />
      Yazdır
    </button>
  );
}

export function CopyLinkInline() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // no clipboard access — nothing further to do in this demo.
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
    </button>
  );
}
