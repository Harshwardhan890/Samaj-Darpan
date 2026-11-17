import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  Info,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  X,
} from "lucide-react";
import type {
  DataClass,
  ProjectStatus,
  VerificationStatus,
} from "@shared/types";
import {
  DATA_CLASS_DESCRIPTIONS,
  DATA_CLASS_LABELS,
  STATUS_LABELS,
  UNAVAILABLE,
  VERIFICATION_LABELS,
} from "@shared/format";

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/* ── Logo ─────────────────────────────────────────────────────────────── */

export function Logo({
  variant = "dark",
  compact = false,
  className,
}: {
  variant?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  const ink = variant === "light" ? "#f6f3ea" : "#071728";
  return (
    <Link
      to="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Samaj Darpan home"
    >
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="9" fill={variant === "light" ? "rgba(246,243,234,0.1)" : "#071728"} />
        <path d="M11 28V17.5L20 12l9 5.5V28" stroke="#2bb3ad" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M16 28v-6.5h8V28" stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="20" cy="10" r="2.1" fill="#c9a227" />
        <path d="M11 31.5h18" stroke={variant === "light" ? "#f6f3ea" : "#071728"} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      </svg>
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span
            className="font-display text-[1.02rem] font-semibold tracking-[0.09em]"
            style={{ color: variant === "light" ? "#f6f3ea" : "#071728" }}
          >
            SAMAJ DARPAN
          </span>
          <span
            className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.2em]"
            style={{ color: variant === "light" ? "rgba(246,243,234,0.6)" : "#5f6b76" }}
          >
            Public infrastructure, in public view
          </span>
        </span>
      ) : null}
    </Link>
  );
}

/* ── Button ───────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "teal" | "gold" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        `btn-${variant}`,
        size === "sm" && "btn-sm",
        size === "lg" && "btn-lg",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
      {!loading ? iconRight : null}
    </button>
  );
}

/* ── Badges ───────────────────────────────────────────────────────────── */

export type Tone =
  | "neutral"
  | "navy"
  | "teal"
  | "green"
  | "amber"
  | "red"
  | "gold"
  | "violet";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-cream-100 text-ink-700 border-cream-300",
  navy: "bg-navy-900 text-cream-50 border-navy-900",
  teal: "bg-teal-50 text-teal-700 border-teal-500/25",
  green: "bg-emerald-50 text-emerald-700 border-emerald-600/25",
  amber: "bg-amber-50 text-amber-800 border-amber-600/30",
  red: "bg-red-50 text-red-700 border-red-600/25",
  gold: "bg-gold-100 text-gold-600 border-gold-500/35",
  violet: "bg-violet-50 text-violet-700 border-violet-500/25",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span className={cn("badge border", toneClasses[tone], className)}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

const statusTone: Record<ProjectStatus, Tone> = {
  planned: "neutral",
  ongoing: "teal",
  completed: "green",
  delayed: "amber",
  stalled: "red",
  unknown: "neutral",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={statusTone[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const dataClassTone: Record<DataClass, Tone> = {
  official: "teal",
  "admin-verified": "green",
  imported: "navy",
  "user-submitted": "violet",
  demonstration: "gold",
};

const dataClassShort: Record<DataClass, string> = {
  official: "Official data",
  "admin-verified": "Admin verified",
  imported: "Public record",
  "user-submitted": "Citizen submitted",
  demonstration: "Demonstration",
};

export function DataClassBadge({
  dataClass,
  short = true,
}: {
  dataClass: DataClass;
  short?: boolean;
}) {
  return (
    <Badge tone={dataClassTone[dataClass]}>
      {short ? dataClassShort[dataClass] : DATA_CLASS_LABELS[dataClass]}
    </Badge>
  );
}

const verificationTone: Record<VerificationStatus, Tone> = {
  imported: "neutral",
  "under-review": "amber",
  verified: "teal",
  published: "green",
  outdated: "amber",
  rejected: "red",
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const Icon =
    status === "verified" || status === "published"
      ? ShieldCheck
      : status === "imported"
        ? Database
        : status === "under-review"
          ? Clock3
          : ShieldQuestion;
  return (
    <Badge tone={verificationTone[status]}>
      <Icon size={11} />
      {VERIFICATION_LABELS[status]}
    </Badge>
  );
}

export function Unavailable({ className }: { className?: string }) {
  return (
    <span className={cn("text-sm italic text-ink-400", className)}>{UNAVAILABLE}</span>
  );
}

/* ── Data provenance notice ───────────────────────────────────────────── */

export function DataProvenanceNotice({
  counts,
  className,
  compact = false,
}: {
  counts: { dataClass: DataClass; count: number }[];
  className?: string;
  compact?: boolean;
}) {
  const demo = counts.find((c) => c.dataClass === "demonstration")?.count ?? 0;
  const official = counts
    .filter((c) => c.dataClass !== "demonstration")
    .reduce((sum, c) => sum + c.count, 0);
  if (!demo && !official) return null;
  if (!demo) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg border border-teal-500/20 bg-teal-50/70 px-3.5 py-2.5 text-[12.5px] text-teal-800",
          className,
        )}
      >
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        <p>
          <strong>{official}</strong> sourced public records. Every record carries its
          source, retrieval date and verification state.
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-gold-500/35 bg-gold-100/60 px-4 py-3 text-[12.5px] text-[#6b5412]",
        className,
      )}
    >
      <FileWarning size={16} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-bold">
          {compact
            ? `${demo} demonstration record${demo === 1 ? "" : "s"} in this view`
            : "This view includes demonstration data"}
        </p>
        <p className="mt-0.5 leading-relaxed opacity-90">
          {demo} record{demo === 1 ? " is" : "s are"} illustrative only and marked with a
          gold badge. {official} sourced record{official === 1 ? "" : "s"} also shown.
          Demonstration records carry no financial or location claims.
        </p>
      </div>
    </div>
  );
}

/* ── Layout helpers ───────────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="text-2xl sm:text-[1.75rem]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b hairline bg-cream-50">
      <div className="container-page py-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
            <h1 className="text-[2rem] sm:text-[2.6rem]">{title}</h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const accent: Record<Tone, string> = {
    neutral: "text-navy-900",
    navy: "text-navy-900",
    teal: "text-teal-600",
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    gold: "text-gold-600",
    violet: "text-violet-700",
  };
  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
          {label}
        </p>
        {icon ? <span className={cn("opacity-70", accent[tone])}>{icon}</span> : null}
      </div>
      <p className={cn("mt-2 font-display text-[1.75rem] leading-none", accent[tone])}>
        {value}
      </p>
      {detail ? <div className="mt-2 text-xs text-ink-500">{detail}</div> : null}
    </div>
  );
}

/* ── Empty / error / loading ──────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "gold" | "teal";
}) {
  const tint =
    tone === "gold"
      ? "bg-gold-100 text-gold-600"
      : tone === "teal"
        ? "bg-teal-50 text-teal-600"
        : "bg-cream-100 text-ink-500";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-navy-900/15 bg-white/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-full", tint)}>
        {icon ?? <Info size={20} />}
      </span>
      <h3 className="font-display text-lg">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center",
        className,
      )}
    >
      <AlertCircle size={22} className="text-red-600" />
      <p className="mt-2 text-sm font-semibold text-red-800">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingBlock({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-3 h-5 w-2/3" />
          <div className="skeleton mt-3 h-3 w-full" />
          <div className="skeleton mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin" />;
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "no-scrollbar flex gap-1 overflow-x-auto border-b hairline",
        className,
      )}
      role="tablist"
      aria-label="Sections"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3.5 py-3 text-[13px] font-bold transition",
              active
                ? "text-navy-900"
                : "text-ink-500 hover:text-navy-800",
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-teal-100 text-teal-700" : "bg-cream-100 text-ink-500",
                )}
              >
                {tab.count}
              </span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy-950/55 p-4 pt-[8vh] backdrop-blur-sm">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-scale-in relative z-10 w-full rounded-2xl border border-white/20 bg-cream-50 shadow-lift",
          sizes[width],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b hairline px-5 py-4">
          <div>
            <h2 className="font-display text-xl">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-500 hover:bg-cream-200 hover:text-navy-900"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t hairline px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Misc ─────────────────────────────────────────────────────────────── */

export function SourceLine({
  organisation,
  url,
  retrievedAt,
  className,
}: {
  organisation: string;
  url: string | null;
  retrievedAt?: string | null;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-ink-400", className)}>
      <Database size={11} />
      <span>Source: {organisation}</span>
      {url ? (
        <>
          <span aria-hidden="true">·</span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="link-underline inline-flex items-center gap-1 font-semibold text-teal-700"
          >
            View record <ArrowRight size={10} />
          </a>
        </>
      ) : null}
      {retrievedAt ? (
        <>
          <span aria-hidden="true">·</span>
          <span>Retrieved {new Date(retrievedAt).toLocaleDateString("en-IN")}</span>
        </>
      ) : null}
    </p>
  );
}

export function AccuracyNote({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "verified" }) {
  const map = {
    info: "border-navy-900/10 bg-cream-100/80 text-ink-700",
    warning: "border-amber-500/30 bg-amber-50/80 text-[#6b5412]",
    verified: "border-teal-500/25 bg-teal-50/70 text-teal-800",
  };
  const Icon = tone === "warning" ? AlertCircle : tone === "verified" ? CheckCircle2 : Info;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[12px] leading-relaxed", map[tone])}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function DemoRibbon() {
  return (
    <Badge tone="gold" className="gap-1">
      <Sparkles size={10} /> Demonstration
    </Badge>
  );
}
