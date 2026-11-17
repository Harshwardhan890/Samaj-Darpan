import crypto from "node:crypto";
import type {
  FundingBreakdown,
  Project,
  ProjectCategory,
  ProjectStatus,
  ResponsibilityChain,
} from "../../src/shared/types";
import { CITIES } from "../../src/shared/cities";

export interface RawRow {
  [key: string]: unknown;
}

export interface NormalizationContext {
  sourceId: string | null;
  sourceOrganisation: string;
  sourceUrl: string | null;
  dataClass: Project["dataClass"];
  retrievedAt?: string;
}

export interface NormalizationResult {
  project: Project;
  warnings: string[];
}

const NOW = () => new Date().toISOString();

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(row: RawRow, aliases: string[]): { key: string; value: unknown } | null {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const wanted = key(alias);
    const found = entries.find(([k]) => key(k) === wanted);
    if (found && found[1] !== null && found[1] !== undefined && String(found[1]).trim() !== "") {
      return { key: found[0], value: found[1] };
    }
  }
  return null;
}

function text(row: RawRow, aliases: string[]): string | null {
  const found = pick(row, aliases);
  if (!found) return null;
  const value = String(found.value).trim();
  return value || null;
}

/** Parse a number only when the column name declares the unit. */
export function parseMoney(
  row: RawRow,
  aliases: string[],
): { value: number | null; warning: string | null } {
  const found = pick(row, aliases);
  if (!found) return { value: null, warning: null };
  const cleaned = String(found.value).replace(/[,₹\s]/g, "").replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  if (!Number.isFinite(number) || number <= 0) {
    return {
      value: null,
      warning: `Could not parse "${found.key}" value "${String(found.value)}".`,
    };
  }
  const k = key(found.key);
  if (/(crore|cr)$/.test(k) || k.includes("crore")) {
    return { value: Math.round(number * 1e7), warning: null };
  }
  if (k.includes("lakh")) return { value: Math.round(number * 1e5), warning: null };
  if (k.includes("thousand")) return { value: Math.round(number * 1e3), warning: null };
  if (k.includes("rupee") || k.includes("amountinr") || k.endsWith("inr")) {
    return { value: Math.round(number), warning: null };
  }
  return {
    value: null,
    warning: `Column "${found.key}" does not declare a currency unit; amount left blank rather than guessed.`,
  };
}

export function parseDate(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
    return Number.isNaN(new Date(iso).getTime()) ? null : iso;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/[%,\s]/g, ""));
  if (!Number.isFinite(number) || number < 0 || number > 100) return null;
  return number;
}

function mapStatus(value: string | null): ProjectStatus {
  if (!value) return "unknown";
  const v = value.toLowerCase();
  if (/(complete|commission|inaugurat|finished|operational)/.test(v)) return "completed";
  if (/(delay|behind schedule|overdue)/.test(v)) return "delayed";
  if (/(stall|halt|suspended|abandon)/.test(v)) return "stalled";
  if (/(ongoing|progress|construction|under implementation|execution)/.test(v)) return "ongoing";
  if (/(plan|approv|sanction|tender|pre-construction|conceptual)/.test(v)) return "planned";
  return "unknown";
}

const CATEGORY_RULES: { category: ProjectCategory; re: RegExp }[] = [
  { category: "metro", re: /metro|mrt|rapid transit/i },
  { category: "rail", re: /rail|railway|station|track/i },
  { category: "airports", re: /airport|airstrip|terminal/i },
  { category: "bridges", re: /bridge|flyover|overpass|viaduct|causeway/i },
  { category: "roads", re: /road|highway|street|pavement|expressway|corridor/i },
  { category: "water", re: /water supply|pipeline|sewerage|sewage|drain|jal/i },
  { category: "sanitation", re: /sanitation|solid waste|toilet|swachh|waste/i },
  { category: "housing", re: /housing|shelter|awas|residential/i },
  { category: "health", re: /hospital|health|clinic|dispensary|medical/i },
  { category: "education", re: /school|college|university|education|library/i },
  { category: "energy", re: /power|energy|solar|electric|transmission|substation/i },
  { category: "parks", re: /park|garden|green|playground|recreation/i },
  { category: "public-buildings", re: /building|bhavan|office|complex|civic centre|community hall/i },
];

export function inferCategory(value: string | null): ProjectCategory {
  if (!value) return "other";
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(value)) return rule.category;
  }
  return "other";
}

function resolveCity(
  stateText: string | null,
  cityText: string | null,
  districtText: string | null,
): { city: string | null; citySlug: string | null; state: string; stateSlug: string } {
  const probe = [cityText, districtText].filter(Boolean).join(" ").toLowerCase();
  const city =
    CITIES.find(
      (c) =>
        cityText &&
        (c.name.toLowerCase() === cityText.toLowerCase() ||
          c.slug === cityText.toLowerCase()),
    ) ??
    CITIES.find((c) => cityText && c.name.toLowerCase().includes(cityText.toLowerCase())) ??
    CITIES.find((c) => probe && c.aliases?.some((a) => probe.includes(a))) ??
    CITIES.find(
      (c) => !cityText && stateText && c.name.toLowerCase() === stateText.toLowerCase(),
    );
  if (city) {
    return {
      city: city.name,
      citySlug: city.slug,
      state: city.state,
      stateSlug: city.stateSlug,
    };
  }
  const state = stateText ?? "";
  return {
    city: cityText,
    citySlug: null,
    state,
    stateSlug: state
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  };
}

function validCoordinate(lat: number | null, lng: number | null): boolean {
  return (
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 6 &&
    lat <= 38 &&
    lng >= 68 &&
    lng <= 98
  );
}

function parseCoordinate(value: unknown, kind: "lat" | "lng"): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).trim());
  if (!Number.isFinite(number)) return null;
  if (kind === "lat" && (number < 6 || number > 38)) return null;
  if (kind === "lng" && (number < 68 || number > 98)) return null;
  return number;
}

export function normalizeRow(
  row: RawRow,
  ctx: NormalizationContext,
): NormalizationResult {
  const warnings: string[] = [];

  const name =
    text(row, [
      "project_name",
      "project name",
      "name_of_project",
      "name of the project",
      "project",
      "work_name",
      "work name",
      "road_name",
      "scheme_name",
      "title",
      "name",
    ]) ?? null;
  if (!name) warnings.push("No project name column detected.");

  const stateText = text(row, ["state", "state_name", "state/ut", "state ut"]);
  const cityText = text(row, ["city", "city_name", "town", "urban_local_body", "municipality"]);
  const districtText = text(row, ["district", "district_name"]);
  const scope = resolveCity(stateText, cityText, districtText);
  if (!cityText) warnings.push("No city column detected; record is shown at state level.");

  const statusText = text(row, [
    "status",
    "project_status",
    "current_status",
    "implementation_status",
  ]);
  const status = mapStatus(statusText);
  if (statusText && status === "unknown") {
    warnings.push(`Unrecognised status "${statusText}" mapped to "unknown".`);
  }

  const categoryText =
    text(row, ["category", "sector", "project_category", "type_of_work", "work_type"]) ??
    name;
  const category = inferCategory(categoryText);

  const approved = parseMoney(row, [
    "approved_cost_crore",
    "approved_budget_crore",
    "project_cost_crore",
    "sanctioned_cost_crore",
    "estimated_cost_crore",
    "total_cost_crore",
    "cost_crore",
    "budget_crore",
    "approved_cost_lakh",
    "approved_budget_lakh",
    "sanctioned_cost_lakh",
    "approved_cost_inr",
    "approved_budget_inr",
    "cost_inr",
    "project_cost",
    "sanctioned_cost",
    "approved_cost",
    "approved_budget",
    "budget",
    "cost",
  ]);
  const revised = parseMoney(row, [
    "revised_cost_crore",
    "revised_budget_crore",
    "revised_cost_lakh",
    "revised_budget_lakh",
    "revised_cost_inr",
    "revised_budget_inr",
    "revised_cost",
    "revised_budget",
  ]);
  const expenditure = parseMoney(row, [
    "expenditure_crore",
    "expenditure_lakh",
    "expenditure_inr",
    "amount_released_crore",
    "amount_spent_crore",
    "expenditure",
    "amount_spent",
  ]);
  warnings.push(
    ...[approved.warning, revised.warning, expenditure.warning].filter(
      (w): w is string => Boolean(w),
    ),
  );

  const lat = parseCoordinate(
    pick(row, ["latitude", "lat", "project_latitude"])?.value ?? null,
    "lat",
  );
  const lng = parseCoordinate(
    pick(row, ["longitude", "lng", "lon", "long", "project_longitude"])?.value ?? null,
    "lng",
  );
  const coordsOk = validCoordinate(lat, lng);
  if ((lat !== null || lng !== null) && !coordsOk) {
    warnings.push("Coordinates were present but outside India's bounding box; not plotted.");
  }

  const sourceId =
    text(row, [
      "project_id",
      "project_code",
      "sanction_no",
      "sanction_number",
      "work_id",
      "tender_id",
      "id",
    ]) ?? null;

  const externalKey =
    ctx.sourceId && sourceId
      ? `${ctx.sourceId}:${sourceId}`
      : `${ctx.sourceOrganisation}:${name ?? "unnamed"}:${scope.citySlug ?? scope.stateSlug}:${lat ?? ""}:${lng ?? ""}`;
  const id = ctx.sourceId
    ? `prj_${crypto.createHash("sha1").update(externalKey).digest("hex").slice(0, 14)}`
    : `imp_${crypto.createHash("sha1").update(externalKey + Math.random()).digest("hex").slice(0, 14)}`;

  const funds: FundingBreakdown = {
    central: null,
    state: null,
    municipal: null,
    other: null,
    otherSourceLabel: null,
    notes: text(row, ["funding_notes", "funding_pattern", "remarks"]),
    sourceUrl: ctx.sourceUrl,
  };
  const responsibility: ResponsibilityChain = {
    sanctioningAuthority: text(row, ["sanctioning_authority", "sanction_authority"]),
    executingAgency: text(row, ["executing_agency", "implementing_agency"]),
    tenderingAuthority: text(row, ["tendering_authority", "tender_authority"]),
    supervisingDepartment: text(row, [
      "supervising_department",
      "department",
      "executing_department",
    ]),
    contractor: text(row, ["contractor", "contractor_name", "agency"]),
    sourceUrl: ctx.sourceUrl,
  };

  const project: Project = {
    id,
    sourceId,
    sourceOrganisation: ctx.sourceOrganisation,
    sourceUrl: ctx.sourceUrl,
    retrievedAt: ctx.retrievedAt ?? NOW(),
    lastUpdated: ctx.retrievedAt ?? NOW(),
    lastVerifiedAt: null,
    dataClass: ctx.dataClass,
    verificationStatus: ctx.dataClass === "demonstration" ? "imported" : "imported",
    name: name ?? "Untitled imported record",
    description: text(row, ["description", "project_description", "details", "scope"]),
    state: scope.state,
    stateSlug: scope.stateSlug,
    city: scope.city,
    citySlug: scope.citySlug,
    district: districtText,
    lat: coordsOk ? lat : null,
    lng: coordsOk ? lng : null,
    // Imported coordinates are never treated as confirmed. An administrator
    // must check the point against the cited source before it is plotted as a
    // verified location.
    coordinatesVerified: false,
    category,
    status,
    executingDepartment:
      responsibility.supervisingDepartment ?? responsibility.executingAgency,
    fundingAuthority: text(row, ["funding_authority", "funding_agency"]),
    implementingAgency: responsibility.executingAgency,
    contractor: responsibility.contractor,
    approvedBudget: approved.value,
    revisedBudget: revised.value,
    expenditure: expenditure.value,
    currency: "INR",
    startDate: parseDate(
      text(row, ["start_date", "project_start_date", "date_of_start", "commencement_date"]),
    ),
    expectedCompletion: parseDate(
      text(row, [
        "expected_completion",
        "expected_completion_date",
        "target_completion_date",
        "completion_date",
      ]),
    ),
    actualCompletion: parseDate(
      text(row, ["actual_completion", "actual_completion_date", "date_of_completion"]),
    ),
    physicalProgress: parsePercent(
      text(row, ["physical_progress", "physical_progress_percent", "progress_percent"]),
    ),
    financialProgress: parsePercent(
      text(row, ["financial_progress", "financial_progress_percent"]),
    ),
    funding: funds,
    responsibility,
    representatives: [],
    documents: ctx.sourceUrl
      ? [
          {
            id: `doc_${crypto.createHash("sha1").update(ctx.sourceUrl + id).digest("hex").slice(0, 10)}`,
            title: "Source record",
            kind: "report",
            url: ctx.sourceUrl,
            publishedAt: null,
            sourceOrganisation: ctx.sourceOrganisation,
            addedAt: NOW(),
          },
        ]
      : [],
    caveats: [
      `Imported from ${ctx.sourceOrganisation}. Fields absent from the source are left blank rather than inferred.`,
    ],
    tags: ["imported"],
  };

  return { project, warnings };
}

export interface ConnectorResult {
  ok: boolean;
  projects: Project[];
  raw: unknown[];
  message: string;
  errors: string[];
}

export interface DataConnector {
  id: string;
  sourceOrganisation: string;
  homepage: string;
  /** Whether this connector can retrieve without an administrator file. */
  canFetch: () => boolean;
  fetchProjects: (options?: { limit?: number }) => Promise<ConnectorResult>;
}
