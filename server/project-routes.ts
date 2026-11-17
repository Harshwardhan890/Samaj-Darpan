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
import { audit, getDb, saveDb, type UserRecord } from "./db";
import { requireAuth, requireRole, roleAtLeast, type AuthedRequest } from "./auth";
import { uid } from "./password";

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
}

export function matchesScope(project: Project, filters: ProjectFilters): boolean {
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

projectRouter.get("/projects", (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 12) || 12));
  const filters: ProjectFilters = {
    state: typeof req.query.state === "string" ? req.query.state : undefined,
    city: typeof req.query.city === "string" ? req.query.city : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    dataClass:
      typeof req.query.dataClass === "string" ? req.query.dataClass : undefined,
    verification:
      typeof req.query.verification === "string"
        ? req.query.verification
        : undefined,
    includeDemonstration: req.query.includeDemo !== "false",
  };

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

projectRouter.get("/projects/:id", (req, res) => {
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

  const complaints = database.complaints.filter(
    (c) => c.projectId === project.id && c.isPublic,
  );

  res.json({
    project,
    areaRepresentatives: reps,
    verifiedRepresentatives: links,
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
  const projects = publicProjects({ city, state });
  const map = new Map<
    string,
    { name: string; projects: Project[]; verified: boolean; sources: string[] }
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
    };
    if (isVerified) entry.verified = true;
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
      sources: [...new Set(c.sources)],
      projects: c.projects.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        status: p.status,
      })),
    })),
    note:
      "Contractor records appear only where a cited public source names a contractor. Samaj Darpan does not infer or guess contractor appointments.",
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
