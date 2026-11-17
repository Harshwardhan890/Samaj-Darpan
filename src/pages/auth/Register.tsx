import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { CITIES } from "@shared/cities";
import { AuthLayout, Button, PasswordStrength } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { ApiError, toAppPath } from "@/services/api";
import { Badge } from "@/components/ui";

const STATES = [...new Set(CITIES.map((c) => c.state))].sort();

export default function RegisterPage() {
  const { register, user, loading, demoMode } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    state: "",
    city: "",
    role: "citizen" as "citizen" | "official",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{
    message: string;
    verificationUrl: string | null;
    requiresEmailVerification: boolean;
  } | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const cities = useMemo(
    () =>
      form.state
        ? CITIES.filter((city) => city.state === form.state).sort((a, b) =>
            a.name.localeCompare(b.name),
          )
        : [],
    [form.state],
  );

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => {
      const updated = { ...current, [key]: value };
      if (key === "state") {
        const stillValid = CITIES.some(
          (city) => city.name === updated.city && city.state === value,
        );
        if (!stillValid) updated.city = "";
      }
      return updated;
    });
    setFieldErrors((current) => ({ ...current, [key]: [] }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string[]> = {};
    if (form.fullName.trim().length < 2) errors.fullName = ["Enter your full name."];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim()))
      errors.email = ["Enter a valid email address."];
    if (!/^[6-9]\d{9}$/.test(form.phone.trim()))
      errors.phone = ["Enter a 10-digit Indian mobile number."];
    if (form.password.length < 10) errors.password = ["Use at least 10 characters."];
    else if (
      !/[a-z]/.test(form.password) ||
      !/[A-Z]/.test(form.password) ||
      !/[0-9]/.test(form.password) ||
      !/[^A-Za-z0-9]/.test(form.password)
    )
      errors.password = ["Include uppercase, lowercase, a number, and a symbol."];
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = ["Passwords do not match."];
    if (!form.state) errors.state = ["Select your state."];
    if (!form.city) errors.city = ["Select your city."];
    if (!terms) errors.terms = ["Accept the transparency and privacy notice."];
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted fields.");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    const city = CITIES.find(
      (candidate) => candidate.name === form.city && candidate.state === form.state,
    );
    if (!city) {
      setError("Select a city from the list.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await register({
        ...form,
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: city.slug,
      });
      setResult({
        message: response.message,
        verificationUrl: response.verificationUrl,
        requiresEmailVerification: response.requiresEmailVerification,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Could not create the account.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <AuthLayout
        eyebrow="Account created"
        title="Check your email"
        subtitle="One more step before you can use the platform."
      >
        <div className="rounded-xl border border-teal-500/25 bg-teal-50/60 p-4">
          <MailCheck size={22} className="text-teal-700" />
          <p className="mt-2 text-[13px] font-semibold text-teal-900">{result.message}</p>
          {result.verificationUrl ? (
            <div className="mt-3 rounded-lg border border-gold-500/40 bg-gold-100/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold-600">
                  Demo mode
                </p>
                <Badge tone="gold">Email transport not configured</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6b5412]">
                In production this link is emailed. In demo mode, open it directly:
              </p>
              <Button
                className="mt-2 w-full"
                size="sm"
                variant="gold"
                iconRight={<ArrowRight size={14} />}
                onClick={() => navigate(toAppPath(result.verificationUrl!))}
              >
                Verify this email now
              </Button>
            </div>
          ) : null}
          {result.requiresEmailVerification ? (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
              Government-official accounts are reviewed by an administrator before
              official permissions are enabled. You can still sign in as a citizen.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link to="/login" className="btn btn-primary w-full">Go to sign in</Link>
          <Link to="/" className="btn btn-ghost w-full">Explore without signing in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      wide
      eyebrow="Join the platform"
      title="Create your Samaj Darpan account"
      subtitle="Choose your city, follow public projects and report problems. Your role determines what you can verify or manage."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-teal-700 hover:text-teal-600">
            Sign in
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="fullName">Full name</label>
            <div className="relative">
              <UserRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="fullName"
                className="input !pl-9"
                value={form.fullName}
                onChange={(event) => set("fullName", event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.fullName)}
              />
            </div>
            {fieldErrors.fullName?.[0] ? <p className="field-error">{fieldErrors.fullName[0]}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="email">Email address</label>
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="email"
                type="email"
                className="input !pl-9"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </div>
            {fieldErrors.email?.[0] ? <p className="field-error">{fieldErrors.email[0]}</p> : null}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="phone">Mobile number</label>
          <div className="relative">
            <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-400">
              +91
            </span>
            <input
              id="phone"
              inputMode="numeric"
              maxLength={10}
              className="input !pl-[4.6rem]"
              value={form.phone}
              onChange={(event) => set("phone", event.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              autoComplete="tel-national"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
          </div>
          {fieldErrors.phone?.[0] ? <p className="field-error">{fieldErrors.phone[0]}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="state">State</label>
            <select
              id="state"
              className="input"
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
              aria-invalid={Boolean(fieldErrors.state)}
            >
              <option value="">Select a state</option>
              {STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {fieldErrors.state?.[0] ? <p className="field-error">{fieldErrors.state[0]}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="city">City</label>
            <select
              id="city"
              className="input"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              disabled={!form.state}
              aria-invalid={Boolean(fieldErrors.city)}
            >
              <option value="">{form.state ? "Select a city" : "Select a state first"}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>{city.name}</option>
              ))}
            </select>
            {fieldErrors.city?.[0] ? <p className="field-error">{fieldErrors.city[0]}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <div className="relative">
              <LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="input !pl-9 !pr-10"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-navy-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
            {fieldErrors.password?.[0] ? <p className="field-error">{fieldErrors.password[0]}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
            <div className="relative">
              <LockKeyhole size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="input !pl-9"
                value={form.confirmPassword}
                onChange={(event) => set("confirmPassword", event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
            </div>
            {fieldErrors.confirmPassword?.[0] ? (
              <p className="field-error">{fieldErrors.confirmPassword[0]}</p>
            ) : null}
          </div>
        </div>

        <fieldset>
          <legend className="field-label">User type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <RoleCard
              selected={form.role === "citizen"}
              onClick={() => set("role", "citizen")}
              icon={<UserRound size={16} />}
              title="Citizen"
              description="Explore, follow and report"
            />
            <RoleCard
              selected={form.role === "official"}
              onClick={() => set("role", "official")}
              icon={<BriefcaseBusiness size={16} />}
              title="Government official"
              description="Reviewed before activation"
            />
            <div className="relative cursor-not-allowed rounded-xl border border-dashed border-navy-900/15 bg-cream-50 p-3 opacity-70">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cream-200 text-ink-500">
                  <ShieldCheck size={15} />
                </span>
                <p className="text-[12px] font-bold text-ink-600">Administrator</p>
                <LockKeyhole size={11} className="ml-auto text-ink-400" />
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-ink-400">
                Provisioned by platform operators. Never self-assigned.
              </p>
            </div>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-400">
            <LockKeyhole size={10} /> Role permissions are enforced server-side.
          </p>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-ink-600">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded"
          />
          <span>
            I accept the{" "}
            <Link to="/methodology" className="font-bold text-teal-700 underline">transparency and privacy notice</Link>.
            I understand that demonstration records are not real project claims.
          </span>
        </label>
        {fieldErrors.terms?.[0] ? <p className="field-error">{fieldErrors.terms[0]}</p> : null}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>

        <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-400">
          <Landmark size={12} className="mt-0.5 shrink-0" />
          {demoMode
            ? "Demo mode: verification links are displayed on screen because no mail transport is configured."
            : "A verification email will be sent before first sign-in."}
        </p>
      </form>
    </AuthLayout>
  );
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border p-3 text-left transition ${
        selected
          ? "border-teal-500/60 bg-teal-50/60 ring-1 ring-teal-500/20"
          : "border-navy-900/12 bg-white hover:border-teal-500/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md ${
            selected ? "bg-teal-600 text-white" : "bg-cream-100 text-ink-500"
          }`}
        >
          {icon}
        </span>
        <p className="text-[12px] font-bold text-navy-900">{title}</p>
        {selected ? <CheckCircle2 size={13} className="ml-auto text-teal-600" /> : null}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-400">{description}</p>
    </button>
  );
}
