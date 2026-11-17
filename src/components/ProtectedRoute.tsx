import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { Button, Logo, Spinner } from "@/components/ui";
import { Link } from "react-router-dom";
import type { UserRole } from "@shared/types";

const rank: Record<UserRole, number> = { citizen: 1, official: 2, admin: 3 };

export function ProtectedRoute({
  role,
  children,
}: {
  role?: UserRole;
  children?: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-teal-600">
        <Spinner size={26} />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (role && rank[user.role] < rank[role]) {
    return <Forbidden required={role} />;
  }

  return <>{children ?? <Outlet />}</>;
}

function Forbidden({ required }: { required: UserRole }) {
  const { user } = useAuth();
  const { cityName } = useCity();
  return (
    <div className="container-page flex min-h-[62vh] items-center justify-center py-16">
      <div className="card max-w-lg p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert size={22} />
        </span>
        <h1 className="mt-4 text-2xl">Access restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          This area requires {required === "admin" ? "administrator" : "government official"} access.
          You are signed in as a {user?.role}. Role permissions are enforced on the
          server, not only in this interface.
        </p>
        {cityName ? (
          <p className="mt-1 text-xs text-ink-400">Active location: {cityName}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn btn-primary">Return to overview</Link>
          <Link to="/account" className="btn btn-outline">Your account</Link>
        </div>
      </div>
    </div>
  );
}

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between">
      <img
        src="/images/auth-hero.jpg"
        alt="Atal Setu sea bridge in Mumbai, an example of Indian public infrastructure"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/90 via-navy-950/40 to-navy-950/95" />
      <div className="absolute inset-0 navy-grid opacity-40" />
      <div className="relative z-10 flex items-start justify-between p-9">
        <Logo variant="light" />
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cream-50/70 backdrop-blur">
          Independent civic platform
        </span>
      </div>
      <div className="relative z-10 max-w-xl p-9 pb-12">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
          <span className="h-px w-7 bg-teal-400" /> Public infrastructure, in public view
        </p>
        <h1 className="font-display text-[2.65rem] leading-[1.04] text-cream-50 xl:text-[3.15rem]">
          Every Project Has a Story.
          <br />
          Every Citizen Deserves to Know.
        </h1>
        <p className="mt-5 max-w-md text-[13.5px] leading-relaxed text-cream-50/65">
          Follow public infrastructure from sanction to completion. See who funds
          it, who builds it, which department executes it, and which records are
          still missing.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/15 pt-5">
          <div>
            <p className="font-display text-2xl text-cream-50">40</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cream-50/45">
              Cities covered
            </p>
          </div>
          <div>
            <p className="font-display text-2xl text-cream-50">5</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cream-50/45">
              Public sources
            </p>
          </div>
          <div>
            <p className="font-display text-2xl text-cream-50">0</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cream-50/45">
              Invented figures
            </p>
          </div>
        </div>
        <p className="mt-5 text-[10.5px] text-cream-50/35">
          Photograph: Atal Setu, Mumbai · Wikimedia Commons, CC0. Representative
          infrastructure image, not a project deliverable.
        </p>
      </div>
    </div>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-50 lg:flex-row">
      <AuthBrandPanel />
      <div className="relative flex flex-1 flex-col">
        <div className="absolute inset-0 paper-grid opacity-60" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between p-5 lg:hidden">
          <Logo />
          <Link to="/" className="text-[11px] font-bold text-ink-500 hover:text-navy-900">
            Back to site
          </Link>
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className={wide ? "w-full max-w-[540px]" : "w-full max-w-[430px]"}>
            <div className="hidden justify-end lg:flex">
              <Link
                to="/"
                className="text-[11px] font-bold text-ink-400 transition hover:text-navy-900"
              >
                Back to platform
              </Link>
            </div>
            <div className="mt-3 rounded-2xl border border-navy-900/10 bg-white p-6 shadow-lift sm:p-8">
              {eyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-600">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="mt-2 font-display text-[1.85rem] leading-tight">{title}</h2>
              {subtitle ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">{subtitle}</p>
              ) : null}
              <div className="mt-6">{children}</div>
            </div>
            {footer ? <div className="mt-5 text-center text-[12px] text-ink-500">{footer}</div> : null}
            <p className="mx-auto mt-6 max-w-sm text-center text-[10px] leading-relaxed text-ink-400">
              Samaj Darpan is an independent transparency project, not a government
              website. Political and project records show their source and
              verification state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "10+ characters", pass: password.length >= 10 },
    { label: "Upper & lowercase", pass: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i < score
                ? score <= 2
                  ? "bg-amber-500"
                  : "bg-teal-500"
                : "bg-cream-200"
            }`}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-center gap-1 text-[10px] font-semibold ${
              check.pass ? "text-teal-700" : "text-ink-400"
            }`}
          >
            <span className={`h-1 w-1 rounded-full ${check.pass ? "bg-teal-500" : "bg-ink-400"}`} />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { Button };
