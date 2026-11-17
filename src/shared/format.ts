import type {
  DataClass,
  ProjectCategory,
  ProjectStatus,
  UserRole,
  VerificationStatus,
} from "./types";

export const UNAVAILABLE = "Information not publicly available.";

export function isKnownNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Format an INR amount with Indian digit grouping. Returns null when unknown. */
export function formatINR(value: number | null | undefined): string | null {
  if (!isKnownNumber(value)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact Indian rupee: ₹1.24 crore / ₹8.6 lakh. */
export function formatINRCompact(value: number | null | undefined): string | null {
  if (!isKnownNumber(value)) return null;
  const abs = Math.abs(value);
  if (abs >= 1e12) return `₹${trim(value / 1e12)} lakh crore`;
  if (abs >= 1e7) return `₹${trim(value / 1e7)} crore`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)} lakh`;
  if (abs >= 1e3) return `₹${trim(value / 1e3)} thousand`;
  return `₹${trim(value)}`;
}

function trim(n: number): string {
  return n
    .toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function formatPercent(value: number | null | undefined): string | null {
  if (!isKnownNumber(value)) return null;
  return `${trim(value)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  roads: "Roads & Highways",
  bridges: "Bridges & Flyovers",
  metro: "Metro & Urban Transit",
  rail: "Railways",
  airports: "Airports",
  water: "Water Supply",
  sanitation: "Sanitation & Waste",
  housing: "Housing & Shelter",
  health: "Public Health",
  education: "Education",
  energy: "Energy & Utilities",
  parks: "Parks & Public Realm",
  "public-buildings": "Public Buildings",
  other: "Other Infrastructure",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planned",
  ongoing: "Ongoing",
  completed: "Completed",
  delayed: "Delayed",
  stalled: "Stalled",
  unknown: "Status not published",
};

export const STATUS_TONE: Record<ProjectStatus, string> = {
  planned: "slate",
  ongoing: "teal",
  completed: "green",
  delayed: "amber",
  stalled: "red",
  unknown: "slate",
};

export const DATA_CLASS_LABELS: Record<DataClass, string> = {
  official: "Official government data",
  imported: "Imported public record",
  "admin-verified": "Administrator-verified",
  "user-submitted": "Citizen-submitted",
  demonstration: "Demonstration data",
};

export const DATA_CLASS_DESCRIPTIONS: Record<DataClass, string> = {
  official: "Retrieved directly from a government source and not modified.",
  imported: "Imported from a published public dataset or file; not independently verified.",
  "admin-verified": "Checked by a platform administrator against a cited source.",
  "user-submitted": "Provided by a citizen and not verified by government or administrators.",
  demonstration: "Illustrative record for interface demonstration. Not a real project claim.",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  imported: "Imported",
  "under-review": "Under review",
  verified: "Verified",
  published: "Published",
  outdated: "Outdated",
  rejected: "Rejected",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: "Citizen",
  official: "Government official",
  admin: "Administrator",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function pct(part: number, whole: number): number | null {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
