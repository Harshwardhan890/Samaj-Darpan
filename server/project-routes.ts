import { Router } from "express";
import { z } from "zod";
import type {
  Complaint,
  DashboardStats,
  Paginated,
  Project,
  ProjectCategory,
  ProjectStatus,
} from "../src/shared/types";
import { CITIES } from "../src/shared/cities";
import { audit, getDb, saveDb } from "./db";
import { requireAuth, requireRole, roleAtLeast, type AuthedRequest } from "./auth";
import { matchPointToConstituencies } from "./geo";
import { uid } from "./password";
import { rateLimit } from "./rateLimit";

export const projectRouter = Router();

export interface ProjectFilters {
  state?: string;
  city?: string;
  category?: string;
  status?: string;
  q?: string;
  dataClass?: string;
  verification?: string;
  includeDemonstration?: boolean;
  ids?: string[];
}

export function projectsToCsv(projects: Project[]): string {
  const columns: { header: string; get: (p: Project) => unknown }[] = [
    { header: "project_id", get: (p) => p.id },
    { header: "project_name", get: (p) => p.name },
    { header: "description", get: (p) => p.description },
    { header: "state", get: (p) => p.state },
    { header: "city", get: (p) => p.city },
    { header: "district", get: (p) => p.district },
    { header: "category", get: (p) => p.category },
    { header: "status", get: (p) => p.status },
    { header: "approved_cost_inr", get: (p) => p.approvedBudget },
    { header: "revised_cost_inr", get: (p) => p.revisedBudget },
    { header: "expenditure_inr", get: (p) => p.expenditure },
    { header: "physical_progress_percent", get: (p) => p.physicalProgress },
    { header: "financial_progress_percent", get: (p) => p.financialProgress },
    { header: "start_date", get: (p) => p.startDate },
    { header: "expected_completion", get: (p) => p.expectedCompletion },
    { header: "actual_completion", get: (p) => p.actualCompletion },
    { header: "executing_department", get: (p) => p.executingDepartment },
    { header: "funding_authority", get: (p) => p.fundingAuthority },
    { header: "implementing_agency", get: (p) => p.implementingAgency },
    { header: "contractor", get: (p) => p.contractor },
    { header: "latitude", get: (p) => p.lat },
    { header: "longitude", get: (p) => p.lng },
    { header: "coordinates_verified", get: (p) => p.coordinatesVerified },
    { header: "source_organisation", get: (p) => p.sourceOrganisation },
    { header: "source_url", get: (p) => p.sourceUrl },
    { header: "data_class", get: (p) => p.dataClass },
    { header: "verification_status", get: (p) => p.verificationStatus },
  ];
  const escape = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    columns.map((c) => c.header).join(","),
    ...projects.map((p) => columns.map((c) => escape(c.get(p))).join(",")),
  ].join("\n");
}

export function matchesScope(project: Project, filters: ProjectFilters): boolean {
  if (filters.ids && !filters.ids.includes(project.id)) return false;
  if (filters.state && project.stateSlug !== filters.state) return false;
  if (filters.city && filters.city !== "india") {
    const city = CITIES.find(
      (c) => c.slug === filters.city || c.id === filters.city,
    );
    const citySlug = city?.slug ?? filters.city;
    if (project.citySlug !== citySlug && project.citySlug !== city?.id) return false;
  }
  if (filters.category && project.category !== filters.category) return false;
  if (filters.status && project.status !== filters.status) return false;
  if (filters.dataClass && project.dataClass !== filters.dataClass) return false;
  if (filters.verification && project.verificationStatus !== filters.verification)
    return false;
  if (
    filters.includeDemonstration === false &&
    project.dataClass === "demonstration"
  )
    return false;
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      project.name,
      project.description,
      project.city,
      project.state,
      project.district,
      project.executingDepartment,
      project.fundingAuthority,
      project.implementingAgency,
      project.contractor,
      project.sourceOrganisation,
      project.sourceId,
      ...project.tags,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function publicProjects(filters: ProjectFilters = {}): Project[] {
  return getDb().projects.filter(
    (p) => p.verificationStatus !== "rejected" && matchesScope(p, filters),
  );
}

function facet(projects: Project[], key: (p: Project) => string) {
  const map = new Map<string, number>();
  for (const p of projects) {
    const value = key(p);
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildStats(projects: Project[], complaints: Complaint[]): DashboardStats {
  const by = (status: ProjectStatus) =>
    projects.filter((p) => p.status === status).length;

  const cost = projects
    .map((p) => p.expenditure)
    .filter((v): v is number => typeof v === "number");
  const budgets = projects
    .map((p) => p.revisedBudget ?? p.approvedBudget)
    .filter((v): v is number => typeof v === "number");

  const scopeComplaints = complaints;
  const resolved = scopeComplaints.filter((c) => c.status === "resolved").length;

  const deptMap = new Map<string, number>();
  for (const p of projects) {
    const dept = p.executingDepartment ?? "Implementing department not published";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }

  const yearMap = new Map<string, { approved: number; projects: number }>();
  for (const p of projects) {
    const amount = p.revisedBudget ?? p.approvedBudget;
    if (typeof amount !== "number" || !p.startDate) continue;
    const yearValue = new Date(p.startDate).getUTCFullYear();
    if (!Number.isFinite(yearValue)) continue;
    const year = String(yearValue);
    const current = yearMap.get(year) ?? { approved: 0, projects: 0 };
    current.approved += amount;
    current.projects += 1;
    yearMap.set(year, current);
  }

  const dataClassOrder = [
    "official",
    "admin-verified",
    "imported",
    "user-submitted",
    "demonstration",
  ] as const;
  const provenanceMap = new Map<string, number>();
  for (const p of projects) {
    provenanceMap.set(p.dataClass, (provenanceMap.get(p.dataClass) ?? 0) + 1);
  }

  return {
    totalProjects: projects.length,
    ongoing: by("ongoing"),
    completed: by("completed"),
    delayed: by("delayed") + by("stalled"),
    planned: by("planned"),
    documentedExpenditure: cost.length ? cost.reduce((a, b) => a + b, 0) : null,
    documentedBudget: budgets.length ? budgets.reduce((a, b) => a + b, 0) : null,
    projectsWithFinancials: projects.filter(
      (p) =>
        typeof p.approvedBudget === "number" ||
        typeof p.revisedBudget === "number" ||
        typeof p.expenditure === "number",
    ).length,
    projectsWithCoordinates: projects.filter(
      (p) => p.coordinatesVerified && p.lat !== null && p.lng !== null,
    ).length,
    complaints: scopeComplaints.length,
    resolvedComplaints: resolved,
    complaintResolutionRate: scopeComplaints.length
      ? Math.round((resolved / scopeComplaints.length) * 1000) / 10
      : null,
    byCategory: facet(projects, (p) => p.category).map((f) => ({
      category: f.value as ProjectCategory,
      count: f.count,
    })),
    byStatus: facet(projects, (p) => p.status).map((f) => ({
      status: f.value as ProjectStatus,
      count: f.count,
    })),
    byDepartment: [...deptMap.entries()]
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byProvenance: dataClassOrder
      .filter((c) => provenanceMap.has(c))
      .map((dataClass) => ({
        dataClass,
        count: provenanceMap.get(dataClass) ?? 0,
      })),
    budgetByYear: [...yearMap.entries()]
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year.localeCompare(b.year))
      .slice(-8),
    financialProjects: projects
      .filter(
        (p) =>
          typeof (p.revisedBudget ?? p.approvedBudget) === "number" ||
          typeof p.expenditure === "number",
      )
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        approvedBudget: p.revisedBudget ?? p.approvedBudget,
        expenditure: p.expenditure,
      })),
  };
}

function scopeComplaints(filters: ProjectFilters): Complaint[] {
  const projects = publicProjects(filters);
  const allowed = new Set(projects.map((p) => p.id));
  return getDb().complaints.filter(
    (c) => allowed.has(c.projectId) && (filters.dataClass ? true : true),
  );
}

function queryToFilters(query: Record<string, unknown>): ProjectFilters {
  const idsRaw = typeof query.ids === "string" ? query.ids : undefined;
  const ids = idsRaw
    ? idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return {
    state: typeof query.state === "string" ? query.state : undefined,
    city: typeof query.city === "string" ? query.city : undefined,
    category: typeof query.category === "string" ? query.category : undefined,
    status: typeof query.status === "string" ? query.status : undefined,
    q: typeof query.q === "string" ? query.q : undefined,
    dataClass: typeof query.dataClass === "string" ? query.dataClass : undefined,
    verification:
      typeof query.verification === "string" ? query.verification : undefined,
    includeDemonstration: query.includeDemo !== "false",
    ids,
  };
}

projectRouter.get("/projects", (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 12) || 12));
  const filters = queryToFilters(req.query as Record<string, unknown>);

  let items = publicProjects(filters);
  const sort = String(req.query.sort ?? "recent");
  items = [...items].sort((a, b) => {
    if (sort === "budget") {
      const av = a.revisedBudget ?? a.approvedBudget ?? -1;
      const bv = b.revisedBudget ?? b.approvedBudget ?? -1;
      return bv - av;
    }
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "progress") {
      return (b.physicalProgress ?? -1) - (a.physicalProgress ?? -1);
    }
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });

  const total = items.length;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);
  const payload: Paginated<Project> & {
    scope: { official: number; demonstration: number; withCoordinates: number };
  } = {
    items: paged,
    total,
    page,
    pageSize,
    facets: {
      categories: facet(items, (p) => p.category),
      statuses: facet(items, (p) => p.status),
      dataClasses: facet(items, (p) => p.dataClass),
    },
    scope: {
      official: items.filter((p) => p.dataClass !== "demonstration").length,
      demonstration: items.filter((p) => p.dataClass === "demonstration").length,
      withCoordinates: items.filter(
        (p) => p.coordinatesVerified && p.lat !== null && p.lng !== null,
      ).length,
    },
  };
  res.json(payload);
});

projectRouter.get("/projects-export", (req, res) => {
  const filters = queryToFilters(req.query as Record<string, unknown>);
  const items = publicProjects(filters);
  const format = String(req.query.format ?? "csv");
  if (format === "json") {
    res.json({ projects: items, total: items.length, exportedAt: new Date().toISOString() });
    return;
  }
  const csv = projectsToCsv(items);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="samaj-darpan-records.csv"');
  res.send(csv);
});

projectRouter.get("/projects-followed", requireAuth, (req: AuthedRequest, res) => {
  const ids = req.user!.followedProjectIds ?? [];
  const projects = getDb().projects.filter(
    (p) => ids.includes(p.id) && p.verificationStatus !== "rejected",
  );
  res.json({ projects, ids: projects.map((p) => p.id) });
});

projectRouter.post("/projects/:id/follow", requireAuth, (req: AuthedRequest, res) => {
  const project = getDb().projects.find(
    (p) => p.id === req.params.id && p.verificationStatus !== "rejected",
  );
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const user = req.user!;
  user.followedProjectIds ??= [];
  if (!user.followedProjectIds.includes(project.id)) {
    user.followedProjectIds = [project.id, ...user.followedProjectIds].slice(0, 200);
    saveDb();
  }
  res.json({ followedProjectIds: user.followedProjectIds });
});

projectRouter.delete("/projects/:id/follow", requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;
  user.followedProjectIds = (user.followedProjectIds ?? []).filter(
    (id) => id !== req.params.id,
  );
  saveDb();
  res.json({ followedProjectIds: user.followedProjectIds });
});

const submissionSchema = z.object({
  name: z.string().trim().min(3, "Enter a project title of at least 3 characters.").max(300),
  state: z.string().trim().min(2, "Select or enter the state."),
  city: z.string().trim().optional(),
  district: z.string().trim().max(120).optional(),
  category: z.enum([
    "roads",
    "bridges",
    "metro",
    "rail",
    "airports",
    "water",
    "sanitation",
    "housing",
    "health",
    "education",
    "energy",
    "parks",
    "public-buildings",
    "other",
  ]),
  status: z.enum(["planned", "ongoing", "completed", "delayed", "stalled", "unknown"]),
  description: z
    .string()
    .trim()
    .min(20, "Describe the public record in at least 20 characters.")
    .max(4000),
  executingDepartment: z.string().trim().max(240).optional(),
  contractor: z.string().trim().max(240).optional(),
  approvedBudgetCrore: z.number().nonnegative().max(1_000_000).nullable().optional(),
  sourceOrganisation: z.string().trim().min(2, "Name the source organisation.").max(200),
  sourceUrl: z
    .string()
    .trim()
    .url("Provide a valid http:// or https:// source URL.")
    .refine((u) => /^https?:\/\//i.test(u), "Source URL must start with http:// or https://."),
});

projectRouter.post(
  "/submissions/projects",
  requireAuth,
  rateLimit({ windowMs: 15 * 60_000, max: 15, keyPrefix: "submit-project" }),
  (req: AuthedRequest, res) => {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Please check the submitted project details.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      });
      return;
    }
    const input = parsed.data;
    const matchedCity = input.city
      ? CITIES.find(
          (c) =>
            c.slug === input.city!.toLowerCase() ||
            c.id === input.city!.toLowerCase() ||
            c.name.toLowerCase() === input.city!.toLowerCase(),
        )
      : undefined;

    const now = new Date().toISOString();
    const id = uid("sub");
    const approvedBudget =
      typeof input.approvedBudgetCrore === "number" && input.approvedBudgetCrore > 0
        ? Math.round(input.approvedBudgetCrore * 1e7)
        : null;

    const project: Project = {
      id,
      sourceId: null,
      sourceOrganisation: input.sourceOrganisation,
      sourceUrl: input.sourceUrl,
      retrievedAt: now,
      lastUpdated: now,
      lastVerifiedAt: null,
      dataClass: "user-submitted",
      verificationStatus: "under-review",
      name: input.name,
      description: input.description,
      state: matchedCity?.state ?? input.state,
      stateSlug: matchedCity?.stateSlug ?? slugifyState(input.state),
      city: matchedCity?.name ?? (input.city || null),
      citySlug: matchedCity?.slug ?? null,
      district: input.district || null,
      lat: null,
      lng: null,
      coordinatesVerified: false,
      category: input.category as ProjectCategory,
      status: input.status as ProjectStatus,
      executingDepartment: input.executingDepartment || null,
      fundingAuthority: null,
      implementingAgency: input.executingDepartment || null,
      contractor: input.contractor || null,
      approvedBudget,
      revisedBudget: null,
      expenditure: null,
      currency: "INR",
      startDate: null,
      expectedCompletion: null,
      actualCompletion: null,
      physicalProgress: null,
      financialProgress: null,
      funding: {
        central: null,
        state: null,
        municipal: null,
        other: null,
        otherSourceLabel: null,
        notes: null,
        sourceUrl: input.sourceUrl,
      },
      responsibility: {
        sanctioningAuthority: null,
        executingAgency: input.executingDepartment || null,
        tenderingAuthority: null,
        supervisingDepartment: input.executingDepartment || null,
        contractor: input.contractor || null,
        sourceUrl: input.sourceUrl,
      },
      representatives: [],
      documents: [
        {
          id: uid("doc"),
          title: `Submitted source — ${input.sourceOrganisation}`,
          kind: "report",
          url: input.sourceUrl,
          publishedAt: null,
          sourceOrganisation: input.sourceOrganisation,
          addedAt: now,
        },
      ],
      caveats: [
        `Citizen-submitted record contributed by ${req.user!.fullName}. Awaiting administrator verification against the cited source.`,
      ],
      tags: ["user-submitted"],
    };

    getDb().projects.unshift(project);
    saveDb();
    audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "project.submit",
      entityType: "project",
      entityId: project.id,
      summary: `Submitted citizen project record "${project.name}".`,
      before: null,
      after: { dataClass: project.dataClass, verificationStatus: project.verificationStatus },
    });
    res.status(201).json({ project });
  },
);

projectRouter.get("/projects/:id", (req: AuthedRequest, res) => {
  const project = getDb().projects.find((p) => p.id === req.params.id);
  if (!project || project.verificationStatus === "rejected") {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  const database = getDb();
  const reps = database.representatives.filter(
    (r) =>
      (project.citySlug && r.citySlug === project.citySlug) ||
      (r.stateSlug === project.stateSlug && r.role === "mp" && !project.citySlug),
  );
  const links = project.representatives
    .filter((link) => link.basis !== "unverified")
    .map((link) => {
      const rep = database.representatives.find(
        (r) => r.id === link.representativeId,
      );
      return rep ? { ...link, representative: rep } : null;
    })
    .filter(Boolean);

  const boundaryMatches =
    project.lat !== null && project.lng !== null && database.geo.constituencies
      ? matchPointToConstituencies(
          project.lat,
          project.lng,
          database.geo.constituencies,
          database.representatives,
        )
      : [];

  const isStateOfficial =
    req.user?.role === "official" &&
    Boolean(req.user.officialVerified) &&
    slugifyState(req.user.state ?? "") === slugifyState(project.stateSlug ?? "");
  const isAdmin = req.user?.role === "admin";

  const complaints = database.complaints.filter(
    (c) =>
      c.projectId === project.id &&
      (c.isPublic || isAdmin || isStateOfficial || (req.user && c.authorId === req.user.id)),
  );

  res.json({
    project,
    areaRepresentatives: reps,
    verifiedRepresentatives: links,
    boundaryMatches,
    complaints,
    source: {
      organisation: project.sourceOrganisation,
      url: project.sourceUrl,
      retrievedAt: project.retrievedAt,
    },
  });
});

projectRouter.get("/dashboard", (req, res) => {
  const filters: ProjectFilters = {
    state: typeof req.query.state === "string" ? req.query.state : undefined,
    city: typeof req.query.city === "string" ? req.query.city : undefined,
    includeDemonstration: req.query.includeDemo !== "false",
  };
  const projects = publicProjects(filters);
  const stats = buildStats(projects, scopeComplaints(filters));
  const city = filters.city
    ? CITIES.find((c) => c.slug === filters.city || c.id === filters.city)
    : undefined;
  const representatives = getDb().representatives.filter((r) => {
    if (city) return r.citySlug === city.slug || r.citySlug === city.id;
    if (filters.state) return r.stateSlug === filters.state;
    return true;
  });
  res.json({
    scope: {
      stateSlug: filters.state ?? null,
      citySlug: city?.slug ?? null,
      cityName: city?.name ?? "All India",
    },
    stats,
    representatives: representatives.slice(0, 12),
    recentProjects: projects
      .filter((p) => p.dataClass !== "demonstration")
      .slice(0, 5),
    sources: getDb().sourceRuns.slice(0, 5),
  });
});

projectRouter.get("/representatives", (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
  const cityRecord = city
    ? CITIES.find((c) => c.slug === city || c.id === city)
    : undefined;
  let reps = getDb().representatives;
  if (cityRecord) {
    reps = reps.filter(
      (r) => r.citySlug === cityRecord.slug || r.citySlug === cityRecord.id,
    );
  } else if (state) {
    reps = reps.filter((r) => r.stateSlug === state);
  }
  if (q) {
    reps = reps.filter((r) =>
      [r.name, r.constituency, r.party, r.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  res.json({ representatives: reps, total: reps.length });
});

projectRouter.get("/contractors", (req, res) => {
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const includeDemonstration = req.query.includeDemo === "true";
  const projects = publicProjects({ city, state, includeDemonstration });
  const map = new Map<
    string,
    { name: string; projects: Project[]; verified: boolean; sources: string[]; totalBudget: number | null }
  >();
  for (const p of projects) {
    if (!p.contractor) continue;
    const isVerified =
      p.verificationStatus === "verified" || p.verificationStatus === "published";
    const entry = map.get(p.contractor) ?? {
      name: p.contractor,
      projects: [],
      verified: isVerified,
      sources: [],
      totalBudget: null,
    };
    if (isVerified) entry.verified = true;
    const cost = p.revisedBudget ?? p.approvedBudget;
    if (typeof cost === "number") {
      entry.totalBudget = (entry.totalBudget ?? 0) + cost;
    }
    entry.projects.push(p);
    if (p.sourceUrl) entry.sources.push(p.sourceUrl);
    map.set(p.contractor, entry);
  }
  res.json({
    contractors: [...map.values()]
      .sort((a, b) => Number(b.verified) - Number(a.verified) || b.projects.length - a.projects.length)
      .map((c) => ({
        name: c.name,
        projectCount: c.projects.length,
        verified: c.verified,
        totalBudget: c.totalBudget,
        sources: [...new Set(c.sources)],
        projects: c.projects.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          city: p.city,
          status: p.status,
        })),
      })),
    note:
      "Contractor records appear only where a cited public source names a contractor. Demonstration records are excluded. Samaj Darpan does not infer or guess contractor appointments.",
  });
});

const complaintSchema = z.object({
  projectId: z.string().min(1),
  category: z.enum([
    "quality",
    "delay",
    "safety",
    "cost",
    "accessibility",
    "corruption",
    "other",
  ]),
  title: z.string().trim().min(6, "Give your report a short title.").max(140),
  description: z
    .string()
    .trim()
    .min(30, "Describe the issue in at least 30 characters.")
    .max(4000),
  isPublic: z.boolean().optional().default(true),
});

function slugifyState(state: string): string {
  return state
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

projectRouter.post(
  "/complaints",
  requireAuth,
  (req: AuthedRequest, res) => {
    const parsed = complaintSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Please check the complaint details.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      });
      return;
    }
    const project = getDb().projects.find((p) => p.id === parsed.data.projectId);
    if (!project || project.verificationStatus === "rejected") {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    if (project.dataClass === "demonstration") {
      res.status(400).json({
        error: "Complaints cannot be filed on demonstration records.",
      });
      return;
    }
    const complaint: Complaint = {
      id: uid("cmp"),
      projectId: project.id,
      projectName: project.name,
      citySlug: project.citySlug,
      stateSlug: project.stateSlug,
      authorId: req.user!.id,
      authorName: req.user!.fullName,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      status: "open",
      isPublic: parsed.data.isPublic ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolutionNote: null,
    };
    getDb().complaints.unshift(complaint);
    saveDb();
    audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "complaint.create",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `Complaint filed on "${project.name}".`,
      before: null,
      after: { status: complaint.status, category: complaint.category },
    });
    res.status(201).json({ complaint });
  },
);

projectRouter.get("/complaints", (req: AuthedRequest, res) => {
  const city = typeof req.query.city === "string" ? req.query.city : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;
  const projectId =
    typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  let complaints = getDb().complaints;
  if (city) {
    const cityRecord = CITIES.find((c) => c.slug === city || c.id === city);
    complaints = complaints.filter(
      (c) => c.citySlug === cityRecord?.slug || c.citySlug === cityRecord?.id,
    );
  } else if (state) {
    const stateSlug = slugifyState(state);
    complaints = complaints.filter((c) => slugifyState(c.stateSlug) === stateSlug);
  }
  if (projectId) complaints = complaints.filter((c) => c.projectId === projectId);
  const canSeePrivate =
    req.query.all === "true" &&
    roleAtLeast(req.user, "official") &&
    (req.user?.role === "admin" || Boolean(req.user?.officialVerified));
  if (!canSeePrivate) complaints = complaints.filter((c) => c.isPublic);
  res.json({ complaints, total: complaints.length });
});

projectRouter.get("/complaints/mine", requireAuth, (req: AuthedRequest, res) => {
  const complaints = getDb().complaints.filter(
    (c) => c.authorId === req.user!.id,
  );
  res.json({ complaints, total: complaints.length });
});

projectRouter.patch(
  "/complaints/:id",
  requireRole("official"),
  (req: AuthedRequest, res) => {
    const complaint = getDb().complaints.find((c) => c.id === req.params.id);
    if (!complaint) {
      res.status(404).json({ error: "Complaint not found." });
      return;
    }
    const user = req.user!;
    if (user.role === "official" && !user.officialVerified) {
      res.status(403).json({
        error: "Your government official account is awaiting administrator verification.",
      });
      return;
    }
    const userStateSlug = slugifyState(user.state ?? "");
    const complaintStateSlug = slugifyState(complaint.stateSlug ?? "");
    if (user.role !== "admin" && (!userStateSlug || complaintStateSlug !== userStateSlug)) {
      res.status(403).json({
        error: "Officials can only respond to complaints in their own state.",
      });
      return;
    }
    const schema = z.object({
      status: z.enum(["open", "in-review", "resolved", "rejected"]),
      resolutionNote: z.string().trim().max(2000).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid status update." });
      return;
    }
    const before = { status: complaint.status, resolutionNote: complaint.resolutionNote };
    complaint.status = parsed.data.status;
    if (parsed.data.resolutionNote !== undefined) {
      complaint.resolutionNote = parsed.data.resolutionNote;
    }
    complaint.updatedAt = new Date().toISOString();
    saveDb();
    audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "complaint.status_change",
      entityType: "complaint",
      entityId: complaint.id,
      summary: `Complaint status changed to ${complaint.status}.`,
      before,
      after: { status: complaint.status, resolutionNote: complaint.resolutionNote },
    });
    res.json({ complaint });
  },
);

projectRouter.get("/geo/constituencies", (req, res) => {
  const geo = getDb().geo.constituencies;
  if (!geo) {
    res.status(404).json({
      error:
        "No constituency boundary dataset is configured. An administrator can upload a GeoJSON boundary file.",
    });
    return;
  }
  res.json(geo);
});

projectRouter.get("/audit/mine", requireAuth, (req: AuthedRequest, res) => {
  const entries = getDb().audit.filter((a) => a.actorId === req.user!.id).slice(0, 50);
  res.json({ entries });
});
