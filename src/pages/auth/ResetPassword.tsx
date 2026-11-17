import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { AuthLayout, Button, PasswordStrength } from "@/components/ProtectedRoute";
import { ApiError, apiFetch } from "@/services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Invalid link"
        title="This reset link is incomplete"
        subtitle="Password reset links contain a single-use token. Request a new link to continue."
      >
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
          <AlertCircle size={16} className="mb-1" />
          No reset token was provided.
        </div>
        <Link to="/forgot-password" className="btn btn-primary mt-4 w-full">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        eyebrow="Password updated"
        title="Your password has been changed"
        subtitle="All existing sessions were signed out. Use your new password to continue."
      >
        <div className="rounded-xl border border-teal-500/25 bg-teal-50/60 p-4 text-center">
          <CheckCircle2 size={26} className="mx-auto text-teal-700" />
          <p className="mt-2 text-[13px] font-semibold text-teal-900">
            Password updated successfully.
          </p>
        </div>
        <Link to="/login" className="btn btn-primary mt-4 w-full">Sign in</Link>
      </AuthLayout>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      return;
    }
    if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError("Include uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Choose a new password"
      subtitle="Use at least 10 characters with uppercase, lowercase, a number and a symbol."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        ) : null}
        <div>
          <label htmlFor="password" className="field-label">New password</label>
          <div className="relative">
            <LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input !pl-9 !pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
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
          <PasswordStrength password={password} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="field-label">Confirm new password</label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
