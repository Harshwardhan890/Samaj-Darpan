import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SessionUser, UserRole } from "@shared/types";
import { ApiError, apiFetch, setAuthToken } from "@/services/api";
import { isSupabaseConfigured, supabase } from "@/services/supabase";

export interface AuthUser extends SessionUser {
  officialVerified: boolean;
  isDemo: boolean;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  state: string;
  city: string;
  role: "citizen" | "official";
}

export interface RegisterResult {
  user: AuthUser | null;
  requiresEmailVerification: boolean;
  verificationUrl: string | null;
  message: string;
}

export interface DemoAccount {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  state: string;
  city: string;
  description: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  demoAccounts: DemoAccount[];
  supabaseEnabled: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  register: (input: RegisterInput) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: Partial<Pick<AuthUser, "fullName" | "phone" | "state" | "city">>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchServerUser(): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<{ user: AuthUser | null }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [supabaseEnabled] = useState(isSupabaseConfigured);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const providers = await apiFetch<{
          demoMode: boolean;
          supabaseConfigured: boolean;
        }>("/auth/providers").catch(() => ({ demoMode: false, supabaseConfigured: false }));
        if (cancelled) return;
        setDemoMode(providers.demoMode);
        if (providers.demoMode) {
          const accounts = await apiFetch<{ enabled: boolean; accounts: DemoAccount[] }>(
            "/auth/demo-accounts",
          ).catch(() => ({ enabled: false, accounts: [] }));
          if (!cancelled) setDemoAccounts(accounts.accounts);
        }

        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setAuthToken(data.session.access_token);
            const me = await fetchServerUser();
            if (!cancelled) setUser(me);
          }
          supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
              setAuthToken(session.access_token);
              const me = await fetchServerUser();
              setUser(me);
            } else {
              setAuthToken(null);
              setUser(null);
            }
          });
        } else {
          const me = await fetchServerUser();
          if (!cancelled) setUser(me);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    setError(null);
    if (supabase) {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        const message =
          authError.message === "Invalid login credentials"
            ? "Email or password is incorrect."
            : authError.message;
        setError(message);
        throw new ApiError(message, 401);
      }
      if (data.session) {
        setAuthToken(data.session.access_token);
        const me = await fetchServerUser();
        setUser(me);
      }
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember }),
      });
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign in.";
      setError(message);
      throw err;
    }
  }, []);

  const demoLogin = useCallback(async (role: UserRole) => {
    setError(null);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open demo account.";
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<RegisterResult> => {
      setError(null);
      if (supabase) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName,
              phone: input.phone,
              state: input.state,
              city: input.city,
            },
          },
        });
        if (authError) {
          setError(authError.message);
          throw new ApiError(authError.message, 400);
        }
        if (data.session) {
          setAuthToken(data.session.access_token);
          const me = await fetchServerUser();
          setUser(me);
        }
        return {
          user: null,
          requiresEmailVerification: !data.session,
          verificationUrl: null,
          message:
            "Account created. Check your email to verify the address before signing in. Government-official access is granted by an administrator after verification.",
        };
      }

      try {
        const data = await apiFetch<RegisterResult>("/auth/register", {
          method: "POST",
          body: JSON.stringify(input),
        });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not create the account.";
        setError(message);
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut();
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      setAuthToken(data.session?.access_token ?? null);
    }
    const me = await fetchServerUser();
    setUser(me);
  }, []);

  const updateProfile = useCallback(
    async (input: Partial<Pick<AuthUser, "fullName" | "phone" | "state" | "city">>) => {
      const data = await apiFetch<{ user: AuthUser }>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setUser(data.user);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      demoMode,
      demoAccounts,
      supabaseEnabled,
      login,
      demoLogin,
      register,
      logout,
      refresh,
      updateProfile,
      clearError: () => setError(null),
    }),
    [
      user,
      loading,
      error,
      demoMode,
      demoAccounts,
      supabaseEnabled,
      login,
      demoLogin,
      register,
      logout,
      refresh,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
