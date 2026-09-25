import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as adminApi from "../lib/adminApi";

interface AdminAuthValue {
  status: "loading" | "authenticated" | "anonymous";
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getSession()
      .then((res) => {
        if (cancelled) return;
        setStatus(res.authenticated ? "authenticated" : "anonymous");
        setUsername(res.username);
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const res = await adminApi.login(u, p);
    setStatus("authenticated");
    setUsername(res.username);
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout().catch(() => {});
    setStatus("anonymous");
    setUsername(null);
  }, []);

  const value = useMemo(() => ({ status, username, login, logout }), [status, username, login, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
