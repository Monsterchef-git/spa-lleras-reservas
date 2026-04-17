import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "staff";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function deriveName(u: User): string {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = (meta.name as string) || (meta.full_name as string) || "";
  if (name) return name;
  const email = u.email ?? "";
  return email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRole = async (u: User): Promise<AppRole | null> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id)
      .order("role", { ascending: true });
    if (error || !data || data.length === 0) return null;
    // admin wins over staff
    if (data.some((r) => r.role === "admin")) return "admin";
    if (data.some((r) => r.role === "staff")) return "staff";
    return null;
  };

  const hydrate = async (s: Session | null) => {
    if (!s?.user) {
      setUser(null);
      return;
    }
    const role = await loadRole(s.user);
    setUser({
      id: s.user.id,
      email: s.user.email ?? "",
      name: deriveName(s.user),
      role,
    });
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // defer Supabase calls to avoid deadlock
      setTimeout(() => {
        hydrate(s);
      }, 0);
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      hydrate(s).finally(() => setIsLoading(false));
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshRole = async () => {
    if (session?.user) {
      const role = await loadRole(session.user);
      setUser((prev) => (prev ? { ...prev, role } : prev));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
