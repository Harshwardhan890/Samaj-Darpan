import { Router } from "express";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { CITIES } from "../src/shared/cities";
import type {
  AuditEntry,
  DataClass,
  ImportJob,
  Project,
  VerificationStatus,
} from "../src/shared/types";
import {
  audit,
  getDb,
  saveDb,
  sourceStatuses,
  type UserRecord,
} from "./db";
import { requireRole, type AuthedRequest } from "./auth";
import { connectorById, CONNECTORS } from "./dataSources";
import { normalizeRow } from "./dataSources/normalize";
import { upsertProjects } from "./upsert";
import { uid } from "./password";

export const adminRouter = Router();
adminRouter.use(requireRole("admin"));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

function slugifyState(state: string): string {
  return state
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

adminRouter.get("/overview", (req, res) => {
  const database = getDb();
  const projects = database.projects;
  const nonDemo = projects.filter((p) => p.dataClass !== "demonstration");
  const pending = nonDemo.filter(
    (p) =>
      p.verificationStatus === "imported" ||
      p.verificationStatus === "under-review",
  );
  const duplicates: {
    key: string;
    name: string;
    ids: string[];
    statuses: VerificationStatus[];
  }[] = [];
  const groups = new Map<string, Project[]>();
  for (const p of nonDemo) {
    if (p.verificationStatus === "rejected") continue;
    const key = `${normaliseName(p.name)}::${p.citySlug ?? p.stateSlug}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicates.push({
        key,
        name: group[0].name,
        ids: group.map((p) => p.id),
        statuses: group.map((p) => p.verificationStatus),
      });
    }
  }

  res.json({
    counts: {
      total: projects.length,
      official: nonDemo.length,
      demonstration: projects.filter((p) => p.dataClass === "demonstration").length,
      pending: pending.length,
      verified: nonDemo.filter((p) => p.verificationStatus === "verified").length,
      published: nonDemo.filter((p) => p.verificationStatus === "published").length,
      outdated: nonDemo.filter((p) => p.verificationStatus === "outdated").length,
      missingCoordinates: nonDemo.filter((p) => !p.coordinatesVerified).length,
      missingFinancials: nonDemo.filter(
        (p) => p.approvedBudget === null && p.expenditure === null,
      ).length,
      missingContractor: nonDemo.filter((p) => !p.contractor).length,
      users: database.users.length,
      imports: database.imports.length,
    },
    verificationQueue: pending.slice(0, 12),
    duplicateGroups: duplicates.slice(0, 12),
    sources: sourceStatuses(),
    recentImports: database.imports.slice(0, 6),
    recentAudit: database.audit.slice(0, 12),
    dataQuality: {
      coordinateCoverage:
        nonDemo.length === 0
          ? null
          : Math.round(
              (nonDemo.filter((p) => p.coordinatesVerified).length / nonDemo.length) * 1000,
            ) / 10,
      financialCoverage:
        nonDemo.length === 0
          ? null
          : Math.round(
              (nonDemo.filter((p) => p.approvedBudget !== null).length /
                nonDemo.length) *
                1000,
            ) / 10,
      contractorCoverage:
        nonDemo.length === 0
          ? null
          : Math.round(
              (nonDemo.filter((p) => p.contractor).length / nonDemo.length) * 1000,
            ) / 10,
    },
  });
});

adminRouter.get("/projects", (req, res) => {
  const database = getDb();
  const q = String(req.query.q ?? "").toLowerCase();
  const verification = String(req.query.verification ?? "all");
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 25) || 25));
  let projects = database.projects;
  if (verification !== "all") {
    projects = projects.filter((p) => p.verificationStatus === verification);
  }
  if (q) {
    projects = projects.filter((p) =>
      [p.name, p.city, p.state, p.sourceOrganisation, p.sourceId, p.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  projects = [...projects].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
  res.json({
    items: projects.slice((page - 1) * pageSize, page * pageSize),
    total: projects.length,
    page,
    pageSize,
  });
});

adminRouter.get("/imports", (req, res) => {
  res.json({ imports: getDb().imports });
});

adminRouter.get("/audit", (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 50) || 50));
  const entries = getDb().audit;
  res.json({
    entries: entries.slice((page - 1) * pageSize, page * pageSize),
    total: entries.length,
    page,
    pageSize,
  });
});

adminRouter.get("/users", (req, res) => {
  res.json({
    users: getDb().users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      state: u.state,
      city: u.city,
      emailVerified: u.emailVerified,
      officialVerified: u.officialVerified,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      authProvider: u.authProvider,
    })),
  });
});

adminRouter.patch("/users/:id", (req: AuthedRequest, res) => {
  const user = getDb().users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (user.id === req.user!.id && req.body?.role && req.body.role !== "admin") {
    res.status(400).json({ error: "You cannot remove your own administrator access." });
    return;
  }
  const schema = z.object({
    role: z.enum(["citizen", "official", "admin"]).optional(),
    officialVerified: z.boolean().optional(),
    emailVerified: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user update." });
    return;
  }
  const before = {
    role: user.role,
    officialVerified: user.officialVerified,
    emailVerified: user.emailVerified,
  };
  Object.assign(user, parsed.data);
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "user.update",
    entityType: "auth",
    entityId: user.id,
    summary: `Updated account ${user.email}.`,
    before,
    after: parsed.data as Record<string, unknown>,
  });
  res.json({ ok: true });
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(300).optional(),
  description: z.string().max(8000).nullable().optional(),
  state: z.string().trim().min(2).optional(),
  city: z.string().nullable().optional(),
  citySlug: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  lat: z.number().min(6).max(38).nullable().optional(),
  lng: z.number().min(68).max(98).nullable().optional(),
  coordinatesVerified: z.boolean().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  executingDepartment: z.string().nullable().optional(),
  fundingAuthority: z.string().nullable().optional(),
  implementingAgency: z.string().nullable().optional(),
  contractor: z.string().nullable().optional(),
  approvedBudget: z.number().nonnegative().nullable().optional(),
  revisedBudget: z.number().nonnegative().nullable().optional(),
  expenditure: z.number().nonnegative().nullable().optional(),
  startDate: z.string().nullable().optional(),
  expectedCompletion: z.string().nullable().optional(),
  actualCompletion: z.string().nullable().optional(),
  physicalProgress: z.number().min(0).max(100).nullable().optional(),
  financialProgress: z.number().min(0).max(100).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  sourceOrganisation: z.string().optional(),
  dataClass: z
    .enum(["official", "imported", "admin-verified", "user-submitted"])
    .optional(),
  verificationStatus: z
    .enum(["imported", "under-review", "verified", "published", "outdated", "rejected"])
    .optional(),
  caveats: z.array(z.string().max(1000)).optional(),
  lastVerifiedAt: z.string().nullable().optional(),
});

adminRouter.patch("/projects/:id", (req: AuthedRequest, res) => {
  const project = getDb().projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Some fields are invalid.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
    return;
  }
  const before = JSON.parse(JSON.stringify(project)) as Project;
  const patch = { ...parsed.data } as Partial<Project>;

  const effectiveSourceUrl =
    patch.sourceUrl !== undefined ? patch.sourceUrl : project.sourceUrl;
  if (patch.verificationStatus === "published" && !effectiveSourceUrl) {
    res.status(400).json({
      error: "A published record needs a source URL. Add the source before publishing.",
    });
    return;
  }
  if (
    project.dataClass === "demonstration" &&
    (patch.verificationStatus === "verified" ||
      patch.verificationStatus === "published")
  ) {
    res.status(400).json({
      error: "Demonstration records are illustrative and cannot be verified or published.",
    });
    return;
  }
  const effectiveLat = patch.lat !== undefined ? patch.lat : project.lat;
  const effectiveLng = patch.lng !== undefined ? patch.lng : project.lng;
  if (
    patch.coordinatesVerified === true &&
    (effectiveLat === null || effectiveLng === null)
  ) {
    res.status(400).json({
      error: "Add a latitude and longitude before marking a coordinate verified.",
    });
    return;
  }

  if (patch.city !== undefined) {
    const city = CITIES.find(
      (c) => c.name.toLowerCase() === (patch.city ?? "").toLowerCase(),
    );
    if (city) {
      project.city = city.name;
      project.citySlug = city.slug;
      project.state = city.state;
      project.stateSlug = city.stateSlug;
    } else {
      project.city = patch.city;
      if (patch.citySlug) project.citySlug = patch.citySlug;
    }
  }
  if (patch.state) {
    project.state = patch.state;
    project.stateSlug = slugifyState(patch.state);
  }
  const {
    city: _city,
    state: _state,
    ...rest
  } = patch;
  Object.assign(project, rest);
  project.lastUpdated = new Date().toISOString();

  if (
    patch.verificationStatus === "verified" ||
    patch.verificationStatus === "published"
  ) {
    project.lastVerifiedAt = new Date().toISOString();
  }
  if (patch.lat !== undefined || patch.lng !== undefined) {
    if (project.lat === null || project.lng === null) {
      project.coordinatesVerified = false;
    }
  }

  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action:
      patch.verificationStatus && patch.verificationStatus !== before.verificationStatus
        ? `project.verification.${patch.verificationStatus}`
        : "project.update",
    entityType: "project",
    entityId: project.id,
    summary: `Updated "${project.name}".`,
    before: before as unknown as Record<string, unknown>,
    after: patch as Record<string, unknown>,
  });
  res.json({ project });
});

adminRouter.post("/projects/:id/verify", (req: AuthedRequest, res) => {
  const project = getDb().projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const schema = z.object({
    status: z.enum(["under-review", "verified", "published", "outdated", "rejected"]),
    note: z.string().trim().max(1000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid verification status." });
    return;
  }
  if (project.dataClass === "demonstration") {
    res.status(400).json({
      error: "Demonstration records are illustrative and cannot be verified or published.",
    });
    return;
  }
  if (parsed.data.status === "published" && !project.sourceUrl) {
    res.status(400).json({
      error: "A published record needs a source URL. Add the source before publishing.",
    });
    return;
  }
  const before = { verificationStatus: project.verificationStatus };
  project.verificationStatus = parsed.data.status;
  project.lastVerifiedAt = new Date().toISOString();
  if (parsed.data.note) {
    project.caveats = [...project.caveats, parsed.data.note];
  }
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: `project.verification.${parsed.data.status}`,
    entityType: "project",
    entityId: project.id,
    summary: `"${project.name}" moved to ${parsed.data.status}.`,
    before,
    after: { verificationStatus: project.verificationStatus },
  });
  res.json({ project });
});

adminRouter.post("/projects/:id/representatives", (req: AuthedRequest, res) => {
  const project = getDb().projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const schema = z.object({
    representativeId: z.string().min(1),
    basis: z.enum(["verified-boundary", "admin-verified", "unverified"]),
    note: z.string().trim().max(500).optional(),
    sourceUrl: z.string().url().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid representative link." });
    return;
  }
  const rep = getDb().representatives.find(
    (r) => r.id === parsed.data.representativeId,
  );
  if (!rep) {
    res.status(404).json({ error: "Representative not found." });
    return;
  }
  project.representatives = project.representatives.filter(
    (l) => l.representativeId !== rep.id,
  );
  project.representatives.push({
    representativeId: rep.id,
    basis: parsed.data.basis,
    note: parsed.data.note ?? null,
    verifiedAt:
      parsed.data.basis === "unverified" ? null : new Date().toISOString(),
    sourceUrl: parsed.data.sourceUrl ?? rep.sourceUrl,
  });
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "project.representative.link",
    entityType: "project",
    entityId: project.id,
    summary: `Linked ${rep.name} to "${project.name}" (${parsed.data.basis}).`,
    before: null,
    after: { representativeId: rep.id, basis: parsed.data.basis },
  });
  res.json({ project });
});

adminRouter.post("/duplicates/resolve", (req: AuthedRequest, res) => {
  const schema = z.object({
    keepId: z.string(),
    mergeId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose two records." });
    return;
  }
  const database = getDb();
  const keep = database.projects.find((p) => p.id === parsed.data.keepId);
  const merge = database.projects.find((p) => p.id === parsed.data.mergeId);
  if (!keep || !merge || keep.id === merge.id) {
    res.status(404).json({ error: "Records not found." });
    return;
  }
  const fields: (keyof Project)[] = [
    "approvedBudget",
    "revisedBudget",
    "expenditure",
    "contractor",
    "lat",
    "lng",
    "startDate",
    "expectedCompletion",
    "actualCompletion",
    "physicalProgress",
    "financialProgress",
    "executingDepartment",
    "fundingAuthority",
    "implementingAgency",
    "sourceUrl",
    "sourceId",
  ];
  for (const field of fields) {
    if (keep[field] === null && merge[field] !== null) {
      // Values are copied only where the surviving record has no data.
      (keep as unknown as Record<string, unknown>)[field] = merge[field];
    }
  }
  keep.caveats = [...keep.caveats, `Merged duplicate record ${merge.id} on ${new Date().toISOString().slice(0, 10)}.`];
  merge.verificationStatus = "rejected";
  merge.caveats = [...merge.caveats, `Merged into ${keep.id}.`];
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "project.duplicate.merge",
    entityType: "project",
    entityId: keep.id,
    summary: `Merged ${merge.id} into ${keep.id}.`,
    before: { keepId: keep.id, mergeId: merge.id },
    after: null,
  });
  res.json({ keep, merged: merge.id });
});

adminRouter.post("/sources/:id/run", async (req: AuthedRequest, res) => {
  const connector = connectorById(String(req.params.id));
  if (!connector) {
    res.status(404).json({ error: "Unknown data source." });
    return;
  }
  if (!connector.canFetch()) {
    res.status(409).json({
      error: `${connector.id} cannot be fetched automatically. Import a published extract instead.`,
    });
    return;
  }
  const startedAt = new Date().toISOString();
  try {
    const result = await connector.fetchProjects();
    const outcome = upsertProjects(result.projects);
    const run = {
      id: uid("run"),
      sourceId: connector.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: result.ok ? ("success" as const) : ("failed" as const),
      message: result.message,
      records: result.projects.length,
      actorId: req.user!.id,
    };
    getDb().sourceRuns.unshift(run);
    const rawStore = getDb().sourceRecords;
    rawStore.unshift({
      sourceId: connector.id,
      at: startedAt,
      raw: result.raw.slice(0, 2),
    });
    if (rawStore.length > 20) rawStore.length = 20;
    saveDb();
    audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "source.refresh",
      entityType: "source",
      entityId: connector.id,
      summary: `Refreshed ${connector.id}: ${result.message}`,
      before: null,
      after: { ...outcome },
    });
    res.json({ run, outcome, errors: result.errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed.";
    getDb().sourceRuns.unshift({
      id: uid("run"),
      sourceId: connector.id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      message,
      records: 0,
      actorId: req.user!.id,
    });
    saveDb();
    res.status(502).json({ error: message });
  }
});

adminRouter.post("/sources/refresh-all", async (req: AuthedRequest, res) => {
  const results: { sourceId: string; ok: boolean; message: string }[] = [];
  for (const connector of CONNECTORS) {
    if (!connector.canFetch()) {
      results.push({
        sourceId: connector.id,
        ok: false,
        message: "Not configured for automatic retrieval.",
      });
      continue;
    }
    try {
      const result = await connector.fetchProjects();
      upsertProjects(result.projects);
      getDb().sourceRuns.unshift({
        id: uid("run"),
        sourceId: connector.id,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        status: result.ok ? "success" : "failed",
        message: result.message,
        records: result.projects.length,
        actorId: req.user!.id,
      });
      results.push({ sourceId: connector.id, ok: result.ok, message: result.message });
    } catch (error) {
      results.push({ sourceId: connector.id, ok: false, message: error instanceof Error ? error.message : "failed" });
    }
  }
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "source.refresh_all",
    entityType: "source",
    entityId: "all",
    summary: `Ran refresh-all across ${CONNECTORS.length} sources (${results.filter((r) => r.ok).length} succeeded).`,
    before: null,
    after: { results },
  });
  res.json({ results });
});

function parseSpreadsheet(
  file: Express.Multer.File,
): { rows: Record<string, unknown>[]; error?: string } {
  const name = file.originalname.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    if (parsed.errors.length) {
      return {
        rows: parsed.data,
        error: parsed.errors.slice(0, 3).map((e) => e.message).join("; "),
      };
    }
    return { rows: parsed.data };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { rows: [], error: "The workbook has no sheets." };
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });
    return { rows };
  }
  return { rows: [], error: "Only .csv, .xlsx and .xls files are supported." };
}

adminRouter.post("/import", upload.single("file"), (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Choose a CSV or XLSX file to import." });
    return;
  }
  const sourceOrganisation =
    String(req.body?.sourceOrganisation ?? "").trim() ||
    "Administrator import";
  const sourceUrl = String(req.body?.sourceUrl ?? "").trim() || null;
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    res.status(400).json({ error: "Source URL must start with http:// or https://." });
    return;
  }
  const requestedClass = String(req.body?.dataClass ?? "imported");
  const dataClass: DataClass =
    requestedClass === "official" || requestedClass === "admin-verified"
      ? requestedClass
      : "imported";

  const { rows, error } = parseSpreadsheet(req.file);
  if (error && rows.length === 0) {
    res.status(400).json({ error });
    return;
  }
  if (rows.length === 0) {
    res.status(400).json({ error: "No data rows found in this file." });
    return;
  }
  if (rows.length > 2000) {
    res.status(400).json({
      error: `This file has ${rows.length} rows. Split it into files of 2,000 rows or fewer.`,
    });
    return;
  }

  const errors: string[] = error ? [error] : [];
  const projects: Project[] = [];
  rows.forEach((row, index) => {
    const { project, warnings } = normalizeRow(row, {
      sourceId: `import:${Date.now()}`,
      sourceOrganisation,
      sourceUrl,
      dataClass,
      retrievedAt: new Date().toISOString(),
    });
    project.id = `imp_${Date.now().toString(36)}_${index}`;
    project.verificationStatus = "imported";
    if (warnings.length) {
      errors.push(`Row ${index + 2}: ${warnings.join(" ")}`);
    }
    projects.push(project);
  });

  const outcome = upsertProjects(projects);
  const job: ImportJob = {
    id: uid("imp"),
    fileName: req.file.originalname.replace(/[^\w.-]+/g, "_").slice(0, 120),
    sourceOrganisation,
    sourceUrl,
    dataClass,
    rowCount: rows.length,
    created: outcome.created,
    updated: outcome.updated,
    skipped: outcome.skipped,
    duplicateCandidates: outcome.duplicateCandidates.length,
    status: errors.length ? "needs-review" : "committed",
    createdBy: req.user!.fullName,
    createdAt: new Date().toISOString(),
    errors: errors.slice(0, 60),
    projectIds: outcome.projectIds,
  };
  getDb().imports.unshift(job);
  saveDb();

  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "import.commit",
    entityType: "import",
    entityId: job.id,
    summary: `Imported ${job.fileName}: ${outcome.created} created, ${outcome.updated} updated.`,
    before: null,
    after: {
      rows: rows.length,
      created: outcome.created,
      duplicates: outcome.duplicateCandidates.length,
    },
  });

  res.status(201).json({ job, outcome });
});

adminRouter.post("/geo/constituencies", (req: AuthedRequest, res) => {
  const geojson = req.body?.geojson;
  if (
    !geojson ||
    typeof geojson !== "object" ||
    (geojson as { type?: string }).type !== "FeatureCollection" ||
    !Array.isArray((geojson as { features?: unknown[] }).features)
  ) {
    res.status(400).json({
      error: "Provide a GeoJSON FeatureCollection of constituency polygons.",
    });
    return;
  }
  const features = (geojson as { features: { geometry?: { type?: string } | null }[] }).features;
  if (features.length === 0) {
    res.status(400).json({
      error: "The FeatureCollection contains no features.",
    });
    return;
  }
  const badGeometry = features.find(
    (feature) =>
      !feature?.geometry ||
      (feature.geometry.type !== "Polygon" &&
        feature.geometry.type !== "MultiPolygon"),
  );
  if (badGeometry) {
    res.status(400).json({
      error:
        "Every feature must carry a Polygon or MultiPolygon geometry. Point or line boundaries are not accepted.",
    });
    return;
  }
  getDb().geo.constituencies = geojson;
  getDb().geo.constituenciesUpdatedAt = new Date().toISOString();
  saveDb();
  audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "geo.constituencies.upload",
    entityType: "representative",
    entityId: "constituencies",
    summary: `Uploaded constituency boundary dataset (${features.length} features).`,
    before: null,
    after: { features: features.length },
  });
  res.json({
    ok: true,
    updatedAt: getDb().geo.constituenciesUpdatedAt,
    features: features.length,
  });
});

adminRouter.get("/export", (req, res) => {
  const format = String(req.query.format ?? "json");
  const projects = getDb().projects;
  if (format === "csv") {
    const columns = [
      "id",
      "name",
      "state",
      "city",
      "category",
      "status",
      "approvedBudget",
      "expenditure",
      "contractor",
      "sourceOrganisation",
      "sourceUrl",
      "verificationStatus",
      "dataClass",
    ];
    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      columns.join(","),
      ...projects.map((p) =>
        columns.map((c) => escape((p as unknown as Record<string, unknown>)[c])).join(","),
      ),
    ].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="samaj-darpan-projects.csv"');
    res.send(csv);
    return;
  }
  res.json({ projects, exportedAt: new Date().toISOString() });
});
