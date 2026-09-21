import { Sun, Moon, MonitorCog } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const nextLabel: Record<string, string> = {
  light: "Koyu temaya geç",
  dark: "Sistem temasına geç",
  system: "Açık temaya geç",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, resolved, cycle } = useTheme();
  const Icon = mode === "system" ? MonitorCog : resolved === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={nextLabel[mode]}
      title={nextLabel[mode]}
      className={
        className ??
        "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-faint transition-colors hover:text-heading"
      }
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
