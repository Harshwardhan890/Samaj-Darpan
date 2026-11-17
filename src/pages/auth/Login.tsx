import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AuthLayout, Button } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/api";
import { isSupabaseConfigured, supabase } from "@/services/supabase";
import { ROLE_LABELS } from "@shared/format";
import type { UserRole } from "@shared/types";
import { Badge } from "@/components/ui";

const roleIcon = {
  citizen: UserRound,
  official: BriefcaseBusiness,
  admin: ShieldCheck,
} as const;

export default function LoginPage() {
  const { user, login, demoLogin, demoMode, demoAccounts, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") ? rawNext : null;

  useEffect(() => {
    if (!loading && user) {
      navigate(next ?? (user.role === "admin" ? "/admin" : "/"), { replace: true });
    }
  }, [user, loading, navigate, next]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password, remember);
      toast.push("Welcome back", { description: "You are signed in.", tone: "success" });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not sign in.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = async (role: UserRole) => {
    setError(null);
    setDemoLoading(role);
    try {
      await demoLogin(role);
      toast.push("Demo account opened", {
        description: `Signed in as a ${ROLE_LABELS[role].toLowerCase()}. Data is shared and resettable.`,
        tone: "info",
      });
      navigate(next ?? (role === "admin" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open demo account.");
    } finally {
      setDemoLoading(null);
    }
  };

  const google = async () => {
    if (!supabase) return;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/account`,
      },
    });
    if (oauthError) setError(oauthError.message);
  };

  return (
    <AuthLayout
      eyebrow="Secure access"
      title="Sign in to Samaj Darpan"
      subtitle="Track public projects, follow public money and hold institutions accountable in your city."
      footer={
        <>
          New to Samaj Darpan?{" "}
          <Link to="/register" className="font-bold text-teal-700 hover:text-teal-600">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-800"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div>
          <label className="field-label" htmlFor="email">Email address</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input !pl-9"
              placeholder="you@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </div>
          {fieldErrors.email?.[0] ? <p className="field-error">{fieldErrors.email[0]}</p> : null}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">Password</label>
            <Link
              to="/forgot-password"
              className="mb-1.5 text-[11px] font-bold text-teal-700 hover:text-teal-600"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input !pl-9 !pr-10"
              placeholder="Enter your password"
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-navy-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.password?.[0] ? <p className="field-error">{fieldErrors.password[0]}</p> : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-ink-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          Keep me signed in for 30 days
        </label>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Sign in
        </Button>

        {isSupabaseConfigured ? (
          <>
            <div className="relative py-1 text-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-navy-900/10" />
              <span className="relative bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                or
              </span>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={google}>
              <GoogleMark /> Continue with Google
            </Button>
          </>
        ) : null}

        <p className="flex items-start gap-1.5 pt-1 text-[10.5px] leading-relaxed text-ink-400">
          <Landmark size={12} className="mt-0.5 shrink-0" />
          Sessions are stored in an HTTP-only cookie. Passwords are hashed with scrypt
          and never stored in plain text.
        </p>
      </form>

      {demoMode && demoAccounts.length > 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gold-500/50 bg-gold-100/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-600">
              Demo accounts · evaluation only
            </p>
            <Badge tone="gold">No password needed</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6b5412]">
            Open a role directly. These are seeded demonstration accounts, not real
            government identities.
          </p>
          <div className="mt-2.5 space-y-1.5">
            {demoAccounts.map((account) => {
              const Icon = roleIcon[account.role];
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => useDemo(account.role)}
                  disabled={Boolean(demoLoading)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-gold-500/25 bg-white px-2.5 py-2 text-left transition hover:border-gold-500/60 disabled:opacity-60"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-900 text-cream-50">
                    <Icon size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-navy-900">
                      {ROLE_LABELS[account.role]} demo — {account.fullName}
                    </span>
                    <span className="block truncate text-[10px] text-ink-500">
                      {account.description}
                    </span>
                  </span>
                  {demoLoading === account.role ? (
                    <span className="text-[10px] font-bold text-teal-700">Opening…</span>
                  ) : (
                    <ArrowRight size={13} className="text-ink-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.4 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.7-.2-3.3-.5-4.8H24v9.1h12.4c-.5 2.9-2.1 5.4-4.5 7l7.7 6c4.5-4.2 6.5-10.3 6.5-17.3z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-3.9-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
