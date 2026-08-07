"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthResponse, RolePermission, User, PermissionSection } from "@ims/shared-types";
import { apiFetch } from "./api";

interface AuthContextValue {
  user: User | null;
  permissions: RolePermission[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Immediately update cached user (profile/avatar) without full reload */
  setUser: (user: User | null | ((prev: User | null) => User | null)) => void;
  canRead: (section: PermissionSection | string) => boolean;
  canWrite: (section: PermissionSection | string) => boolean;
  hasAdminAccess: boolean;
  canAdmin: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_SECTIONS = ["admin", "admin_users", "admin_permissions"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("ims_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ user: User; permissions: RolePermission[] }>("/auth/me");
      setUser(res.user);
      setPermissions(res.permissions);
    } catch {
      localStorage.removeItem("ims_token");
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("ims_token", res.token);
    setUser(res.user);
    setPermissions(res.permissions);
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    setUser(null);
    setPermissions([]);
  };

  const refreshUser = async () => {
    const res = await apiFetch<{ user: User; permissions: RolePermission[] }>("/auth/me");
    setUser(res.user);
    setPermissions(res.permissions);
  };

  const canRead = useCallback(
    (section: string) => {
      if (user?.role === "admin") return true;
      const p = permissions.find((x) => x.section === section);
      return p?.canRead ?? false;
    },
    [user, permissions]
  );

  const canWrite = useCallback(
    (section: string) => {
      if (user?.role === "admin") return true;
      const p = permissions.find((x) => x.section === section);
      return p?.canWrite ?? false;
    },
    [user, permissions]
  );

  const isAdmin = user?.role === "admin";
  const hasAdminAccess =
    isAdmin || ADMIN_SECTIONS.some((section) => canRead(section));

  const value = useMemo(
    () => ({
      user,
      permissions,
      loading,
      login,
      logout,
      refreshUser,
      setUser,
      canRead,
      canWrite,
      hasAdminAccess,
      canAdmin: hasAdminAccess,
      isAdmin,
    }),
    [user, permissions, loading, canRead, canWrite, hasAdminAccess, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
