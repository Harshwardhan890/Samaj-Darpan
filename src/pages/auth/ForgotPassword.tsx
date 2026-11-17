import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, MailCheck, Mail } from "lucide-react";
import { AuthLayout, Button } from "@/components/ProtectedRoute";
import { ApiError, apiFetch, toAppPath } from "@/services/api";
import { Badge } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    message: string;
    resetUrl: string | null;
    demoMode: boolean;
  } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch<{
        message: string;
        resetUrl: string | null;
        demoMode: boolean;
      }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResult(response);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create a reset request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <AuthLayout
        eyebrow="Reset requested"
        title="Check your email"
        subtitle="If an account exists for that address, a password reset link has been created."
      >
        <div className="rounded-xl border border-teal-500/25 bg-teal-50/60 p-4">
          <MailCheck size={22} className="text-teal-700" />
          <p className="mt-2 text-[13px] font-semibold text-teal-900">{result.message}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Reset links expire after one hour and can be used once. For privacy, this
            page does not reveal whether an email address is registered.
          </p>
        </div>
        {result.resetUrl ? (
          <div className="mt-4 rounded-xl border border-gold-500/40 bg-gold-100/50 p-4">
            <Badge tone="gold">Demo mode</Badge>
            <p className="mt-2 text-[11px] leading-relaxed text-[#6b5412]">
              Email delivery is not configured in this environment. Use the reset link
              below directly.
            </p>
            <a
              href={toAppPath(result.resetUrl)}
              className="btn btn-gold mt-3 w-full"
            >
              Open reset link <ArrowRight size={14} />
            </a>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          <Link to="/login" className="btn btn-outline w-full">Back to sign in</Link>
          <button
            type="button"
            className="text-[11px] font-bold text-ink-500 hover:text-navy-900"
            onClick={() => setResult(null)}
          >
            Try another email address
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Forgot your password?"
      subtitle="Enter the email address linked to your account. We will create a single-use reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-bold text-teal-700 hover:text-teal-600">
            Return to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error ? (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-800">
            <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
          </div>
        ) : null}
        <div>
          <label htmlFor="email" className="field-label">Email address</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              id="email"
              type="email"
              className="input !pl-9"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
