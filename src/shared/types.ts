export type UserRole = "citizen" | "official" | "admin";

export type DataClass =
  | "official"
  | "imported"
  | "admin-verified"
  | "user-submitted"
  | "demonstration";

export type VerificationStatus =
  | "imported"
  | "under-review"
  | "verified"
  | "published"
  | "outdated"
  | "rejected";

export type ProjectStatus =
  | "planned"
  | "ongoing"
  | "completed"
  | "delayed"
  | "stalled"
  | "unknown";

export type ProjectCategory =
  | "roads"
  | "bridges"
  | "metro"
  | "rail"
  | "airports"
  | "water"
  | "sanitation"
  | "housing"
  | "health"
  | "education"
  | "energy"
  | "parks"
  | "public-buildings"
  | "other";

export type JurisdictionHouse = "lok-sabha" | "vidhan-sabha" | "municipal" | "other";

export type ConstituencyVerification =
  | "verified-boundary"
  | "admin-verified"
  | "unverified";

export interface City {
  id: string;
  name: string;
  slug: string;
  state: string;
  stateSlug: string;
  zone: CityZone;
  lat: number;
  lng: number;
  popular?: boolean;
  aliases?: string[];
  note?: string;
}

export type CityZone = "North" | "West" | "South" | "East & Central";

export interface FundingBreakdown {
  central: number | null;
  state: number | null;
  municipal: number | null;
  other: number | null;
  otherSourceLabel: string | null;
  notes: string | null;
  sourceUrl: string | null;
}

export interface ResponsibilityChain {
  sanctioningAuthority: string | null;
  executingAgency: string | null;
  tenderingAuthority: string | null;
  supervisingDepartment: string | null;
  contractor: string | null;
  sourceUrl: string | null;
}

export interface ProjectDocument {
  id: string;
  title: string;
  kind: "tender" | "dpr" | "report" | "photograph" | "notification" | "other";
  url: string;
  publishedAt: string | null;
  sourceOrganisation: string | null;
  addedAt: string;
}

export interface RepresentativeLink {
  representativeId: string;
  basis: ConstituencyVerification;
  note: string | null;
  verifiedAt: string | null;
  sourceUrl: string | null;
}

export interface Project {
  id: string;
  sourceId: string | null;
  sourceOrganisation: string;
  sourceUrl: string | null;
  retrievedAt: string;
  lastUpdated: string;
  lastVerifiedAt: string | null;
  dataClass: DataClass;
  verificationStatus: VerificationStatus;

  name: string;
  description: string | null;
  state: string;
  stateSlug: string;
  city: string | null;
  citySlug: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  coordinatesVerified: boolean;
  category: ProjectCategory;
  status: ProjectStatus;

  executingDepartment: string | null;
  fundingAuthority: string | null;
  implementingAgency: string | null;
  contractor: string | null;

  approvedBudget: number | null;
  revisedBudget: number | null;
  expenditure: number | null;
  currency: "INR";

  startDate: string | null;
  expectedCompletion: string | null;
  actualCompletion: string | null;

  physicalProgress: number | null;
  financialProgress: number | null;

  funding: FundingBreakdown;
  responsibility: ResponsibilityChain;
  representatives: RepresentativeLink[];
  documents: ProjectDocument[];

  /** Free-text provenance caveats shown on the record. */
  caveats: string[];
  tags: string[];
}

export interface Representative {
  id: string;
  name: string;
  role: "mp" | "mla" | "mayor" | "councillor" | "other";
  house: JurisdictionHouse;
  position: string;
  constituency: string;
  state: string;
  stateSlug: string;
  citySlug: string | null;
  party: string | null;
  termStart: string | null;
  termEnd: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
  sourceOrganisation: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  verification: "verified" | "unverified";
  note: string | null;
}

export type ComplaintStatus = "open" | "in-review" | "resolved" | "rejected";

export interface Complaint {
  id: string;
  projectId: string;
  projectName: string;
  citySlug: string | null;
  stateSlug: string;
  authorId: string;
  authorName: string;
  category:
    | "quality"
    | "delay"
    | "safety"
    | "cost"
    | "accessibility"
    | "corruption"
    | "other";
  title: string;
  description: string;
  status: ComplaintStatus;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  resolutionNote: string | null;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: "project" | "complaint" | "representative" | "import" | "source" | "auth";
  entityId: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  sourceOrganisation: string;
  sourceUrl: string | null;
  dataClass: DataClass;
  rowCount: number;
  created: number;
  updated: number;
  skipped: number;
  duplicateCandidates: number;
  status: "committed" | "failed" | "needs-review";
  createdBy: string;
  createdAt: string;
  errors: string[];
  projectIds: string[];
}

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  state: string | null;
  city: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  authProvider: "local" | "supabase";
}

export interface SourceConnectorStatus {
  id: string;
  name: string;
  organisation: string;
  description: string;
  homepage: string;
  access: "api" | "download" | "manual";
  configured: boolean;
  configuredNote: string;
  lastRunAt: string | null;
  lastRunStatus: "success" | "partial" | "failed" | "never";
  lastRunMessage: string | null;
  recordsLastRun: number;
  totalRecords: number;
  coverage: string;
}

export interface DashboardStats {
  totalProjects: number;
  ongoing: number;
  completed: number;
  delayed: number;
  planned: number;
  documentedExpenditure: number | null;
  documentedBudget: number | null;
  projectsWithFinancials: number;
  projectsWithCoordinates: number;
  complaints: number;
  resolvedComplaints: number;
  complaintResolutionRate: number | null;
  byCategory: { category: ProjectCategory; count: number }[];
  byStatus: { status: ProjectStatus; count: number }[];
  byDepartment: { department: string; count: number }[];
  byProvenance: { dataClass: DataClass; count: number }[];
  /** Approved cost of projects grouped by recorded start year. Never a fabricated time series. */
  budgetByYear: { year: string; approved: number; projects: number }[];
  /** Projects that carry a known approved cost, for budget-vs-expenditure comparison. */
  financialProjects: {
    id: string;
    name: string;
    approvedBudget: number | null;
    expenditure: number | null;
  }[];
}

export interface ProjectQuery {
  state?: string;
  city?: string;
  category?: string;
  status?: string;
  q?: string;
  dataClass?: string;
  verification?: string;
  page?: number;
  pageSize?: number;
  sort?: "recent" | "budget" | "name" | "progress";
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    categories: { value: string; count: number }[];
    statuses: { value: string; count: number }[];
    dataClasses: { value: string; count: number }[];
  };
}
