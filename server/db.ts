import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AuditEntry,
  Complaint,
  ImportJob,
  Project,
  Representative,
  SourceConnectorStatus,
  UserRole,
  SessionUser,
} from "../src/shared/types";
import {
  DEMONSTRATION_PROJECTS,
  OFFICIAL_PROJECTS,
  REPRESENTATIVES,
  SEED_COMPLAINTS,
  SEED_CONSTITUENCIES_GEOJSON,
} from "./seed-data";
import { hashPassword, randomToken, sha256, uid } from "./password";

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(here, "data");
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(DATA_DIR, "db.json");

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  role: UserRole;
  state: string | null;
  city: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  authProvider: "local" | "supabase";
  /** Government officials stay unverified until an administrator approves. */
  officialVerified: boolean;
  followedProjectIds: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PasswordResetRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface SourceRunRecord {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt: string;
  status: "success" | "partial" | "failed";
  message: string;
  records: number;
  actorId: string;
}

export interface DatabaseShape {
  meta: { version: number; createdAt: string; seededWith: string[] };
  users: UserRecord[];
  sessions: SessionRecord[];
  passwordResets: PasswordResetRecord[];
  projects: Project[];
  representatives: Representative[];
  complaints: Complaint[];
  audit: AuditEntry[];
  imports: ImportJob[];
  sourceRuns: SourceRunRecord[];
  sourceRecords: Record<string, unknown>[];
  geo: {
    /** Optional GeoJSON FeatureCollection of constituency polygons, uploaded by an admin. */
    constituencies: unknown | null;
    constituenciesUpdatedAt: string | null;
  };
}

const DEMO_ACCOUNTS = [
  {
    id: "usr_demo_citizen",
    fullName: "Aarav Mehta",
    email: "citizen@demo.samajdarpan.in",
    password: "CitizenDemo!2026",
    role: "citizen" as const,
    state: "Delhi",
    city: "new-delhi",
  },
  {
    id: "usr_demo_official",
    fullName: "Priya Nair",
    email: "official@demo.samajdarpan.in",
    password: "OfficialDemo!2026",
    role: "official" as const,
    state: "Maharashtra",
    city: "mumbai",
  },
  {
    id: "usr_demo_admin",
    fullName: "Kabir Sethi",
    email: "admin@demo.samajdarpan.in",
    password: "AdminDemo!2026",
    role: "admin" as const,
    state: "Delhi",
    city: "new-delhi",
  },
];

export const DEMO_ACCOUNT_META = DEMO_ACCOUNTS.map(({ password: _password, ...rest }) => ({
  ...rest,
  description:
    rest.role === "admin"
      ? "Full data management, verification and import access."
      : rest.role === "official"
        ? "Can review records and respond to complaints in their jurisdiction."
        : "Can explore, follow projects and file complaints.",
}));

function seedUsers(): UserRecord[] {
  return DEMO_ACCOUNTS.map((account) => ({
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    phone: null,
    passwordHash: hashPassword(account.password),
    role: account.role,
    state: account.state,
    city: account.city,
    avatarUrl: null,
    emailVerified: true,
    verificationTokenHash: null,
    verificationExpiresAt: null,
    authProvider: "local" as const,
    officialVerified: true,
    followedProjectIds: [],
    createdAt: "2026-01-12T09:00:00.000Z",
    lastLoginAt: null,
  }));
}

function seedDatabase(): DatabaseShape {
  return {
    meta: {
      version: 2,
      createdAt: new Date().toISOString(),
      seededWith: [
        "official-public-records",
        "demonstration-records",
        "representatives-2024",
        "constituency-boundaries-sample",
      ],
    },
    users: seedUsers(),
    sessions: [],
    passwordResets: [],
    projects: [...OFFICIAL_PROJECTS, ...DEMONSTRATION_PROJECTS],
    representatives: REPRESENTATIVES,
    complaints: [...SEED_COMPLAINTS],
    audit: [
      {
        id: uid("aud"),
        actorId: "system",
        actorName: "Samaj Darpan",
        action: "database.seeded",
        entityType: "import",
        entityId: "seed",
        summary: `Seeded ${OFFICIAL_PROJECTS.length} sourced public records, ${DEMONSTRATION_PROJECTS.length} demonstration records, and ${SEED_COMPLAINTS.length} sample complaints.`,
        before: null,
        after: null,
        createdAt: new Date().toISOString(),
      },
    ],
    imports: [],
    sourceRuns: [],
    sourceRecords: [],
    geo: {
      constituencies: SEED_CONSTITUENCIES_GEOJSON,
      constituenciesUpdatedAt: new Date().toISOString(),
    },
  };
}

let db: DatabaseShape | null = null;
let saveTimer: NodeJS.Timeout | null = null;

export function getDb(): DatabaseShape {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DatabaseShape;
      // Forward-compatible defaults for older data files.
      db.passwordResets ??= [];
      db.sourceRecords ??= [];
      db.geo ??= { constituencies: null, constituenciesUpdatedAt: null };
      db.users = db.users.map((u) => ({
        ...u,
        officialVerified:
          u.id === "usr_demo_official"
            ? true
            : (u.officialVerified ?? u.role !== "official"),
        authProvider: u.authProvider ?? "local",
        followedProjectIds: Array.isArray(u.followedProjectIds) ? u.followedProjectIds : [],
      }));
      return db;
    } catch (error) {
      const backup = `${DB_PATH}.corrupt-${Date.now()}`;
      fs.copyFileSync(DB_PATH, backup);
      console.error(`[db] Could not parse database; backed up to ${backup}`, error);
    }
  }
  db = seedDatabase();
  writeNow();
  return db;
}

export function saveDb(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 40);
}

export function writeNow(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

export function reseed(force = false): void {
  if (fs.existsSync(DB_PATH) && !force) return;
  db = seedDatabase();
  writeNow();
}

export function toSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    state: user.state,
    city: user.city,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    followedProjectIds: user.followedProjectIds ?? [],
    createdAt: user.createdAt,
    authProvider: user.authProvider,
  };
}

export function findUserByEmail(email: string): UserRecord | undefined {
  return getDb().users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

export function findUserById(id: string): UserRecord | undefined {
  return getDb().users.find((u) => u.id === id);
}

export function createSession(userId: string, days: number): string {
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 86_400_000);
  const database = getDb();
  database.sessions = database.sessions.filter(
    (s) => new Date(s.expiresAt).getTime() > Date.now(),
  );
  database.sessions.push({
    tokenHash: sha256(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  saveDb();
  return token;
}

export function sessionUser(token: string | undefined): UserRecord | null {
  if (!token) return null;
  const database = getDb();
  const hash = sha256(token);
  const session = database.sessions.find((s) => s.tokenHash === hash);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    database.sessions = database.sessions.filter((s) => s.tokenHash !== hash);
    saveDb();
    return null;
  }
  return findUserById(session.userId) ?? null;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  const database = getDb();
  database.sessions = database.sessions.filter(
    (s) => s.tokenHash !== sha256(token),
  );
  saveDb();
}

export function audit(entry: Omit<AuditEntry, "id" | "createdAt">): void {
  const database = getDb();
  database.audit.unshift({
    ...entry,
    id: uid("aud"),
    createdAt: new Date().toISOString(),
  });
  if (database.audit.length > 2000) database.audit.length = 2000;
  saveDb();
}

export function sourceStatuses(): SourceConnectorStatus[] {
  const database = getDb();
  const sourceDefs = SOURCE_DEFS.map((def) => {
    const runs = database.sourceRuns.filter((r) => r.sourceId === def.id);
    const last = runs[0];
    return {
      ...def,
      configured: def.isConfigured(),
      lastRunAt: last?.startedAt ?? null,
      lastRunStatus: last?.status ?? ("never" as const),
      lastRunMessage: last?.message ?? null,
      recordsLastRun: last?.records ?? 0,
      totalRecords: database.projects.filter(
        (p) => p.sourceOrganisation === def.organisation,
      ).length,
    };
  });
  return sourceDefs;
}

const OGD_KEY = () => process.env.OGD_API_KEY?.trim() ?? "";

export const SOURCE_DEFS = [
  {
    id: "ogd",
    name: "Open Government Data (OGD) India",
    organisation: "Ministry of Electronics and Information Technology",
    description:
      "Official catalogue and dataset APIs. Requires a free personal API key, which is held server-side only.",
    homepage: "https://data.gov.in/",
    access: "api" as const,
    coverage: "Central and state datasets published on data.gov.in",
    isConfigured: () => Boolean(OGD_KEY()),
    configuredNote: OGD_KEY()
      ? "API key configured on the server."
      : "Set OGD_API_KEY on the server to enable live retrieval.",
  },
  {
    id: "paimana",
    name: "PAIMANA",
    organisation: "Ministry of Statistics and Programme Implementation",
    description:
      "Public dashboard for project monitoring. The portal publishes no documented public API; records must be imported from permitted downloads.",
    homepage: "https://ipm.mospi.gov.in/Home/PublicDashboard",
    access: "manual" as const,
    coverage: "Centrally monitored projects and programmes",
    isConfigured: () => false,
    configuredNote:
      "No documented public API. Use Admin → Import with a permitted published extract.",
  },
  {
    id: "smart-cities",
    name: "Smart Cities Mission Data Portal",
    organisation: "Ministry of Housing and Urban Affairs",
    description:
      "City-level smart city project and indicator data. Use the portal's published downloads; no documented bulk API is assumed.",
    homepage: "https://smartcities.data.gov.in/",
    access: "download" as const,
    coverage: "100 Smart Cities Mission cities",
    isConfigured: () => false,
    configuredNote:
      "Import published CSV/XLSX extracts through Admin → Import.",
  },
  {
    id: "pmgsy",
    name: "PMGSY GeoSadak",
    organisation: "Ministry of Rural Development / NRRDA",
    description:
      "Rural road network and project monitoring. The portal does not publish a documented public API; use permitted downloads only.",
    homepage: "https://geosadak-pmgsy.nic.in/",
    access: "manual" as const,
    coverage: "Pradhan Mantri Gram Sadak Yojana roads",
    isConfigured: () => false,
    configuredNote:
      "No documented public API. Administrator import is the supported path.",
  },
  {
    id: "eprocure",
    name: "Government eProcurement",
    organisation: "Central Public Procurement Portal",
    description:
      "Tender notices and award records. Bulk access is not assumed; tender documents can be attached to records with their source URL.",
    homepage: "https://eprocure.gov.in/eprocure/app",
    access: "manual" as const,
    coverage: "Central and state tender notices",
    isConfigured: () => false,
    configuredNote:
      "Use published tender documents as evidence; automatic bulk retrieval is not enabled.",
  },
];

export { DB_PATH };
