import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface AdminUser { id: number; username: string; }

interface AdminAuth {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

let globalAdmin: AdminUser | null = null;
let listeners: Array<() => void> = [];

function notify() { listeners.forEach(l => l()); }

export function useAdmin(): AdminAuth {
  const [admin, setAdmin] = useState<AdminUser | null>(globalAdmin);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const listener = () => setAdmin(globalAdmin);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.me().then(a => {
      if (!cancelled) { globalAdmin = a; setAdmin(a); }
    }).catch(() => {
      if (!cancelled) { globalAdmin = null; setAdmin(null); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    globalAdmin = res.admin;
    setAdmin(res.admin);
    notify();
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    globalAdmin = null;
    setAdmin(null);
    notify();
  }, []);

  return { admin, loading, login, logout };
}
