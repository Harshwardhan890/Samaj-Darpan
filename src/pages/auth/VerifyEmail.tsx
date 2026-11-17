import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/ProtectedRoute";
import { apiFetch } from "@/services/api";

type VerifyResult = { ok: boolean; message: string };

// Verification tokens are single-use. React StrictMode mounts effects twice in
// development, and a page refresh would also resend the token. Share one
// request per token so the second caller sees the first result instead of a
// misleading "invalid or expired" error.
const verificationResults = new Map<string, VerifyResult>();
const verificationRequests = new Map<string, Promise<VerifyResult>>();

function verifyToken(token: string): Promise<VerifyResult> {
  const cached = verificationResults.get(token);
  if (cached) return Promise.resolve(cached);
  const inFlight = verificationRequests.get(token);
  if (inFlight) return inFlight;
  const request = apiFetch<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
    .then((response) => {
      const result = { ok: true, message: response.message };
      verificationResults.set(token, result);
      return result;
    })
    .catch((error: Error) => {
      const result = {
        ok: false,
        message: error.message || "This verification link is invalid or expired.",
      };
      // Cache only definitive API responses; a transient network failure can be retried.
      if (error.name === "ApiError") verificationResults.set(token, result);
      return result;
    })
    .finally(() => {
      verificationRequests.delete(token);
    });
  verificationRequests.set(token, request);
  return request;
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email address…");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState("error");
      setMessage("This verification link is incomplete.");
      return;
    }
    verifyToken(token).then((result) => {
      if (cancelled) return;
      setState(result.ok ? "success" : "error");
      setMessage(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthLayout
      eyebrow="Email verification"
      title={
        state === "success"
          ? "Email verified"
          : state === "error"
            ? "Verification problem"
            : "Verifying your email"
      }
      subtitle="Verified accounts can sign in, follow projects and submit complaints."
    >
      <div
        className={`rounded-xl border p-5 text-center ${
          state === "success"
            ? "border-teal-500/25 bg-teal-50/60"
            : state === "error"
              ? "border-red-200 bg-red-50"
              : "border-navy-900/10 bg-cream-50"
        }`}
      >
        {state === "verifying" ? (
          <Loader2 size={26} className="mx-auto animate-spin text-teal-600" />
        ) : state === "success" ? (
          <CheckCircle2 size={26} className="mx-auto text-teal-700" />
        ) : (
          <AlertCircle size={26} className="mx-auto text-red-600" />
        )}
        <p className="mt-2 text-[13px] font-semibold text-navy-900">{message}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Link to="/login" className="btn btn-primary w-full">Go to sign in</Link>
        {state === "error" ? (
          <Link to="/register" className="btn btn-outline w-full">Create a new account</Link>
        ) : null}
      </div>
      <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-ink-400">
        <MailCheck size={11} /> Verification links expire after 24 hours.
      </p>
    </AuthLayout>
  );
}
