import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Activity, Lock, User } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { ApiError } from "../../lib/adminApi";
import { useMeta } from "../../lib/useMeta";
import { CriticalNote } from "../../components/ui";

export function Login() {
  useMeta("Yönetici Girişi");
  const { status, login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Giriş yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-cyan-400">
            <Activity className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-heading">ACİLTİMEKG Yönetim Paneli</h1>
          <p className="mt-1 text-sm text-ink-soft">Devam etmek için giriş yapın.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6"
        >
          {error && (
            <div className="mb-4">
              <CriticalNote heading="Giriş başarısız" text={error} />
            </div>
          )}

          <label className="block text-sm font-semibold text-heading" htmlFor="username">
            Kullanıcı adı
          </label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface py-3 pl-10 pr-4 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="admin"
            />
          </div>

          <label className="mt-4 block text-sm font-semibold text-heading" htmlFor="password">
            Şifre
          </label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface py-3 pl-10 pr-4 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-navy-900 py-3.5 text-base font-bold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
