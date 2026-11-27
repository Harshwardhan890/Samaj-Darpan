import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  Unlink,
  Users,
  X,
} from "lucide-react";
import type {
  ConstituencyVerification,
  DataClass,
  Paginated,
  Project,
  ProjectCategory,
  ProjectDocument,
  ProjectStatus,
  Representative,
  VerificationStatus,
} from "@shared/types";
import { CITIES } from "@shared/cities";
import {
  CATEGORY_LABELS,
  DATA_CLASS_LABELS,
  STATUS_LABELS,
  VERIFICATION_LABELS,
  formatDate,
  formatINRCompact,
  relativeDate,
} from "@shared/format";
import {
  Badge,
  Button,
  DataClassBadge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  Tabs,
  VerificationBadge,
} from "@/components/ui";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiFetch, qs } from "@/services/api";

type AdminProjectsResponse = Paginated<Project> & {
  page: number;
  pageSize: number;
};

interface OverviewLite {
  duplicateGroups: {
    key: string;
    name: string;
    ids: string[];
    statuses: VerificationStatus[];
  }[];
}

export default function AdminProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [verification, setVerification] = useState(searchParams.get("verification") ?? "all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    const urlVer = searchParams.get("verification") ?? "all";
    if (urlQ !== debouncedQ && urlQ !== q) {
      setQ(urlQ);
      setDebouncedQ(urlQ);
    }
    if (urlVer !== verification) {
      setVerification(urlVer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (debouncedQ !== q) {
        setDebouncedQ(q);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, debouncedQ]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQ) next.set("q", debouncedQ);
    if (verification && verification !== "all") next.set("verification", verification);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, verification]);

  const path = useMemo(
    () =>
      `/admin/projects${qs({
        q: debouncedQ,
        verification,
        page,
        pageSize: 20,
      })}`,
    [debouncedQ, verification, page],
  );

  const { data, loading, error, refresh } = useApiData<AdminProjectsResponse>(path, [path]);
  const overview = useApiData<OverviewLite>("/admin/overview");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const saved = (project: Project) => {
    setSelected(null);
    setCreating(false);
    refresh();
    overview.refresh();
    void project;
  };

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Projects & verification</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Search all records, correct fields with a cited source, and move records through
              the verification workflow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="teal"
              size="sm"
              onClick={() => setCreating(true)}
              icon={<PlusCircle size={13} />}
            >
              New project
            </Button>
            <a
              href="/api/admin/export?format=csv"
              download="samaj-darpan-projects.csv"
              className="btn btn-outline btn-sm"
            >
              <Download size={13} /> Export CSV
            </a>
            <Link to="/admin/import" className="btn btn-primary btn-sm">
              Import records
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search name, city, source ID…"
              className="input !py-2 !pl-8 !text-[12px]"
              aria-label="Search admin projects"
            />
          </div>
          <select
            value={verification}
            onChange={(event) => {
              setVerification(event.target.value);
              setPage(1);
            }}
            className="input !w-auto !py-2 !text-[12px]"
            aria-label="Filter by verification status"
          >
            <option value="all">All verification states</option>
            {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="ml-auto text-[10.5px] text-ink-400">
            {data?.total ?? 0} record{(data?.total ?? 0) === 1 ? "" : "s"} · page {page} of{" "}
            {totalPages}
          </p>
        </div>
      </section>

      {overview.data && overview.data.duplicateGroups.length > 0 ? (
        <DuplicatePanel
          groups={overview.data.duplicateGroups}
          onResolved={() => {
            refresh();
            overview.refresh();
          }}
        />
      ) : null}

      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-4">
            <LoadingBlock rows={4} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Search size={20} />}
            title="No records match"
            description="Try a different search term or verification state."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[11.5px]">
              <thead className="bg-cream-50 text-[9px] uppercase tracking-[0.1em] text-ink-400">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Record</th>
                  <th className="px-3 py-2.5 font-bold">Location</th>
                  <th className="px-3 py-2.5 font-bold">Source</th>
                  <th className="px-3 py-2.5 font-bold">Provenance</th>
                  <th className="px-3 py-2.5 font-bold">Verification</th>
                  <th className="px-3 py-2.5 font-bold">Updated</th>
                  <th className="px-3 py-2.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {data.items.map((project) => (
                  <tr key={project.id} className="align-top hover:bg-cream-50/60">
                    <td className="px-3 py-2.5">
                      <p className="max-w-[240px] truncate font-bold text-navy-900">
                        {project.name}
                      </p>
                      <p className="font-mono text-[9px] text-ink-400">{project.id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-ink-600">
                      {project.city ?? project.state ?? "—"}
                    </td>
                    <td className="max-w-[170px] px-3 py-2.5">
                      <p className="truncate text-ink-600">{project.sourceOrganisation}</p>
                      <p className="truncate font-mono text-[9px] text-ink-400">
                        {project.sourceId ?? "no source id"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <DataClassBadge dataClass={project.dataClass} />
                    </td>
                    <td className="px-3 py-2.5">
                      <VerificationBadge status={project.verificationStatus} />
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-ink-400">
                      {relativeDate(project.lastUpdated)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/projects/${project.id}`}
                          className="rounded-md p-1.5 text-ink-400 hover:bg-cream-100 hover:text-navy-900"
                          aria-label={`Open ${project.name} publicly`}
                        >
                          <ExternalLink size={13} />
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(project)}
                          icon={<Pencil size={12} />}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && totalPages > 1 ? (
          <div className="flex items-center justify-center gap-2 border-t hairline px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              icon={<ArrowLeft size={12} />}
            >
              Previous
            </Button>
            <span className="px-2 text-[11px] text-ink-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              iconRight={<ArrowRight size={12} />}
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>

      {selected || creating ? (
        <EditProjectModal
          project={selected}
          onClose={() => {
            setSelected(null);
            setCreating(false);
          }}
          onSaved={saved}
          onUpdated={() => {
            refresh();
            overview.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DuplicatePanel({
  groups,
  onResolved,
}: {
  groups: OverviewLite["duplicateGroups"];
  onResolved: () => void;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [merge, setMerge] = useState<Record<string, string>>({});

  const resolve = async (group: OverviewLite["duplicateGroups"][number]) => {
    const keepId = keep[group.key] ?? group.ids[0];
    const mergeId = merge[group.key] ?? group.ids[1] ?? group.ids[0];
    if (keepId === mergeId) {
      toast.push("Choose two different records", { tone: "warning" });
      return;
    }
    setPending(group.key);
    try {
      await apiFetch("/admin/duplicates/resolve", {
        method: "POST",
        body: JSON.stringify({ keepId, mergeId }),
      });
      toast.push("Duplicate merged", {
        description: "The merged record was rejected and its missing values copied where safe.",
        tone: "success",
      });
      onResolved();
    } catch (err) {
      toast.push("Could not merge", {
        description: err instanceof ApiError ? err.message : "Try again.",
        tone: "error",
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg">
            <Copy size={16} className="text-amber-600" /> Duplicate candidates
          </h2>
          <p className="mt-0.5 text-[10.5px] text-ink-400">
            Merging copies only fields that are empty on the surviving record and rejects the
            other record. This is logged.
          </p>
        </div>
        <Badge tone="amber">{groups.length}</Badge>
      </div>
      <ul className="mt-3 space-y-2">
        {groups.map((group) => (
          <li key={group.key} className="rounded-lg border border-amber-500/25 bg-amber-50/40 p-3">
            <p className="text-[11.5px] font-bold text-navy-900">{group.name}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={keep[group.key] ?? group.ids[0]}
                onChange={(event) =>
                  setKeep((current) => ({ ...current, [group.key]: event.target.value }))
                }
                className="input !py-1.5 !text-[11px]"
                aria-label={`Keep record for ${group.name}`}
              >
                {group.ids.map((id) => (
                  <option key={id} value={id}>Keep {id}</option>
                ))}
              </select>
              <select
                value={merge[group.key] ?? group.ids[1] ?? group.ids[0]}
                onChange={(event) =>
                  setMerge((current) => ({ ...current, [group.key]: event.target.value }))
                }
                className="input !py-1.5 !text-[11px]"
                aria-label={`Merge record for ${group.name}`}
              >
                {group.ids.map((id) => (
                  <option key={id} value={id}>Merge {id}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                loading={pending === group.key}
                onClick={() => resolve(group)}
              >
                Merge
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function numOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function EditProjectModal({
  project,
  onClose,
  onSaved,
  onUpdated,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const [activeProject, setActiveProject] = useState<Project | null>(project);
  const isCreate = activeProject === null;
  const [modalTab, setModalTab] = useState<"details" | "funding" | "documents" | "representatives">("details");

  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    city: project?.city ?? "",
    state: project?.state ?? "",
    district: project?.district ?? "",
    category: project?.category ?? ("roads" as ProjectCategory),
    status: project?.status ?? ("ongoing" as ProjectStatus),
    executingDepartment: project?.executingDepartment ?? "",
    fundingAuthority: project?.fundingAuthority ?? "",
    implementingAgency: project?.implementingAgency ?? "",
    contractor: project?.contractor ?? "",
    approvedBudget: project?.approvedBudget?.toString() ?? "",
    revisedBudget: project?.revisedBudget?.toString() ?? "",
    expenditure: project?.expenditure?.toString() ?? "",
    fundingCentral: project?.funding.central?.toString() ?? "",
    fundingState: project?.funding.state?.toString() ?? "",
    fundingMunicipal: project?.funding.municipal?.toString() ?? "",
    fundingOther: project?.funding.other?.toString() ?? "",
    fundingOtherSourceLabel: project?.funding.otherSourceLabel ?? "",
    fundingNotes: project?.funding.notes ?? "",
    sanctioningAuthority: project?.responsibility.sanctioningAuthority ?? "",
    executingAgencyResp: project?.responsibility.executingAgency ?? "",
    tenderingAuthority: project?.responsibility.tenderingAuthority ?? "",
    supervisingDepartment: project?.responsibility.supervisingDepartment ?? "",
    startDate: toDateInput(project?.startDate ?? null),
    expectedCompletion: toDateInput(project?.expectedCompletion ?? null),
    actualCompletion: toDateInput(project?.actualCompletion ?? null),
    physicalProgress: project?.physicalProgress?.toString() ?? "",
    financialProgress: project?.financialProgress?.toString() ?? "",
    lat: project?.lat?.toString() ?? "",
    lng: project?.lng?.toString() ?? "",
    coordinatesVerified: project?.coordinatesVerified ?? false,
    sourceOrganisation: project?.sourceOrganisation ?? "",
    sourceUrl: project?.sourceUrl ?? "",
    dataClass: project?.dataClass ?? ("admin-verified" as DataClass),
    verificationStatus: project?.verificationStatus ?? ("under-review" as VerificationStatus),
    caveats: project?.caveats.join("\n") ?? "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifyPending, setVerifyPending] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repsData = useApiData<{ representatives: Representative[]; total: number }>(
    activeProject
      ? `/representatives${qs({
          state: activeProject.stateSlug,
          city: activeProject.citySlug ?? undefined,
        })}`
      : "/representatives",
    [activeProject?.stateSlug, activeProject?.citySlug],
  );
  const [repId, setRepId] = useState("");
  const [repBasis, setRepBasis] = useState<ConstituencyVerification>("admin-verified");
  const [repNote, setRepNote] = useState("");
  const [repSourceUrl, setRepSourceUrl] = useState("");
  const [linkingRep, setLinkingRep] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docKind, setDocKind] = useState<ProjectDocument["kind"]>("report");
  const [docUrl, setDocUrl] = useState("");
  const [docPublishedAt, setDocPublishedAt] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const cityMatch = CITIES.find(
    (candidate) =>
      candidate.name.toLowerCase() === form.city.trim().toLowerCase() ||
      candidate.slug === form.city.trim().toLowerCase(),
  );

  const linkRepresentative = async () => {
    if (!activeProject) return;
    setError(null);
    if (!repId) {
      setError("Select a representative to link.");
      return;
    }
    if (repSourceUrl && !/^https?:\/\//i.test(repSourceUrl)) {
      setError("Representative source URL must start with http:// or https://.");
      return;
    }
    setLinkingRep(true);
    try {
      const response = await apiFetch<{ project: Project }>(
        `/admin/projects/${activeProject.id}/representatives`,
        {
          method: "POST",
          body: JSON.stringify({
            representativeId: repId,
            basis: repBasis,
            note: repNote.trim() || undefined,
            sourceUrl: repSourceUrl.trim() || null,
          }),
        },
      );
      setActiveProject(response.project);
      setRepId("");
      setRepNote("");
      setRepSourceUrl("");
      onUpdated?.();
      toast.push("Representative attribution linked", {
        description: "Link recorded in the audit log.",
        tone: "success",
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not link representative.",
      );
    } finally {
      setLinkingRep(false);
    }
  };

  const unlinkRepresentative = async (representativeId: string) => {
    if (!activeProject) return;
    setError(null);
    try {
      const response = await apiFetch<{ project: Project }>(
        `/admin/projects/${activeProject.id}/representatives/${representativeId}`,
        { method: "DELETE" },
      );
      setActiveProject(response.project);
      onUpdated?.();
      toast.push("Representative link removed", { tone: "info" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not unlink representative.",
      );
    }
  };

  const addDocument = async () => {
    if (!activeProject) return;
    setError(null);
    if (docTitle.trim().length < 2) {
      setError("Enter a document title.");
      return;
    }
    if (!/^https?:\/\//i.test(docUrl.trim())) {
      setError("Document URL must start with http:// or https://.");
      return;
    }
    setAddingDoc(true);
    try {
      const response = await apiFetch<{ project: Project }>(
        `/admin/projects/${activeProject.id}/documents`,
        {
          method: "POST",
          body: JSON.stringify({
            title: docTitle.trim(),
            kind: docKind,
            url: docUrl.trim(),
            publishedAt: docPublishedAt || null,
          }),
        },
      );
      setActiveProject(response.project);
      setDocTitle("");
      setDocUrl("");
      setDocPublishedAt("");
      onUpdated?.();
      toast.push("Document attached", { tone: "success" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not attach document.");
    } finally {
      setAddingDoc(false);
    }
  };

  const removeDocument = async (docId: string) => {
    if (!activeProject) return;
    setError(null);
    try {
      const response = await apiFetch<{ project: Project }>(
        `/admin/projects/${activeProject.id}/documents/${docId}`,
        { method: "DELETE" },
      );
      setActiveProject(response.project);
      onUpdated?.();
      toast.push("Document removed", { tone: "info" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove document.");
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) {
      setError("Enter a record name.");
      return;
    }
    if (isCreate && !cityMatch && form.state.trim().length < 2) {
      setError("Enter a state or supported city.");
      return;
    }
    if (isCreate && form.sourceOrganisation.trim().length < 2) {
      setError("Enter a source organisation.");
      return;
    }
    if (form.sourceUrl && !/^https?:\/\//i.test(form.sourceUrl)) {
      setError("The source URL must start with http:// or https://.");
      return;
    }
    if ((form.lat && !form.lng) || (!form.lat && form.lng)) {
      setError("Provide both latitude and longitude, or neither.");
      return;
    }
    const latNum = numOrNull(form.lat);
    const lngNum = numOrNull(form.lng);
    if (latNum !== null && (latNum < 6 || latNum > 38)) {
      setError("Latitude must be between 6 and 38 (India bounding box).");
      return;
    }
    if (lngNum !== null && (lngNum < 68 || lngNum > 98)) {
      setError("Longitude must be between 68 and 98 (India bounding box).");
      return;
    }
    const physNum = numOrNull(form.physicalProgress);
    const finNum = numOrNull(form.financialProgress);
    if (physNum !== null && (physNum < 0 || physNum > 100)) {
      setError("Physical progress must be between 0 and 100.");
      return;
    }
    if (finNum !== null && (finNum < 0 || finNum > 100)) {
      setError("Financial progress must be between 0 and 100.");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      city: form.city.trim() || null,
      citySlug: cityMatch?.slug ?? null,
      district: form.district.trim() || null,
      category: form.category,
      status: form.status,
      executingDepartment: form.executingDepartment.trim() || null,
      fundingAuthority: form.fundingAuthority.trim() || null,
      implementingAgency: form.implementingAgency.trim() || null,
      contractor: form.contractor.trim() || null,
      approvedBudget: numOrNull(form.approvedBudget),
      revisedBudget: numOrNull(form.revisedBudget),
      expenditure: numOrNull(form.expenditure),
      startDate: form.startDate || null,
      expectedCompletion: form.expectedCompletion || null,
      actualCompletion: form.actualCompletion || null,
      physicalProgress: physNum,
      financialProgress: finNum,
      lat: latNum,
      lng: lngNum,
      coordinatesVerified: form.coordinatesVerified,
      sourceOrganisation: form.sourceOrganisation.trim() || activeProject?.sourceOrganisation || "",
      sourceUrl: form.sourceUrl.trim() || null,
      verificationStatus: form.verificationStatus,
      caveats: form.caveats
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      funding: {
        central: numOrNull(form.fundingCentral),
        state: numOrNull(form.fundingState),
        municipal: numOrNull(form.fundingMunicipal),
        other: numOrNull(form.fundingOther),
        otherSourceLabel: form.fundingOtherSourceLabel.trim() || null,
        notes: form.fundingNotes.trim() || null,
      },
      responsibility: {
        sanctioningAuthority: form.sanctioningAuthority.trim() || null,
        executingAgency: form.executingAgencyResp.trim() || null,
        tenderingAuthority: form.tenderingAuthority.trim() || null,
        supervisingDepartment: form.supervisingDepartment.trim() || null,
        contractor: form.contractor.trim() || null,
      },
    };
    if (isCreate) {
      payload.state = cityMatch?.state ?? form.state.trim();
      payload.dataClass = form.dataClass === "demonstration" ? "admin-verified" : form.dataClass;
    } else {
      if (!cityMatch && form.state.trim().length >= 2) payload.state = form.state.trim();
      if (activeProject.dataClass !== "demonstration") payload.dataClass = form.dataClass;
    }

    setSaving(true);
    try {
      const response = isCreate
        ? await apiFetch<{ project: Project }>("/admin/projects", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        : await apiFetch<{ project: Project }>(`/admin/projects/${activeProject.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
      toast.push(isCreate ? "Project record created" : "Record saved", {
        description: "Changes were written to the audit log.",
        tone: "success",
      });
      onSaved(response.project);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save this record. Check the numeric fields.",
      );
    } finally {
      setSaving(false);
    }
  };

  const verify = async (status: VerificationStatus) => {
    if (!activeProject) return;
    setError(null);
    setVerifyPending(status);
    try {
      const response = await apiFetch<{ project: Project }>(
        `/admin/projects/${activeProject.id}/verify`,
        {
          method: "POST",
          body: JSON.stringify({
            status,
            note: form.note.trim() || undefined,
          }),
        },
      );
      toast.push(`Record moved to ${VERIFICATION_LABELS[status]}`, {
        tone: "success",
      });
      onSaved(response.project);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change the status.");
    } finally {
      setVerifyPending(null);
    }
  };

  const numeric = (
    key: keyof typeof form,
    label: string,
    suffix?: string,
    showInrPreview = false,
  ) => {
    const val = numOrNull(String(form[key]));
    const inrPreview = showInrPreview && val !== null ? formatINRCompact(val) : null;
    return (
      <div>
        <label className="field-label" htmlFor={`field-${String(key)}`}>
          {label}
          {suffix ? ` (${suffix})` : ""}
        </label>
        <input
          id={`field-${String(key)}`}
          className="input !py-1.5 !text-[12px]"
          value={String(form[key])}
          onChange={(event) => set(key, event.target.value as never)}
          inputMode="decimal"
        />
        {inrPreview ? (
          <p className="mt-0.5 text-[10px] font-semibold text-teal-700">{inrPreview}</p>
        ) : null}
      </div>
    );
  };

  const text = (key: keyof typeof form, label: string) => (
    <div>
      <label className="field-label" htmlFor={`field-${String(key)}`}>{label}</label>
      <input
        id={`field-${String(key)}`}
        className="input !py-1.5 !text-[12px]"
        value={String(form[key])}
        onChange={(event) => set(key, event.target.value as never)}
      />
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isCreate ? "Create new project record" : "Edit record"}
      description={
        isCreate
          ? "Add a sourced public infrastructure record directly to the registry."
          : `${activeProject.id} · ${activeProject.sourceOrganisation}`
      }
      width="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} icon={<CheckCircle2 size={14} />}>
            {isCreate ? "Create record" : "Save changes"}
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        ) : null}

        <Tabs
          value={modalTab}
          onChange={(next) => setModalTab(next as typeof modalTab)}
          tabs={[
            { id: "details", label: "Details & Financials" },
            { id: "funding", label: "Funding & Chain" },
            ...(!isCreate
              ? [
                  {
                    id: "documents",
                    label: "Documents",
                    count: activeProject.documents.length,
                  },
                  {
                    id: "representatives",
                    label: "Representatives",
                    count: activeProject.representatives.length,
                  },
                ]
              : []),
          ]}
        />

        {modalTab === "details" ? (
          <>
            {!isCreate ? (
              <div className="rounded-lg border border-navy-900/10 bg-cream-50 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                  Verification workflow
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["under-review", "verified", "published", "outdated", "rejected"] as VerificationStatus[]).map(
                    (status) => (
                      <Button
                        key={status}
                        type="button"
                        size="sm"
                        variant={status === "published" ? "teal" : "outline"}
                        loading={verifyPending === status}
                        onClick={() => verify(status)}
                        icon={<ShieldCheck size={12} />}
                      >
                        {VERIFICATION_LABELS[status]}
                      </Button>
                    ),
                  )}
                </div>
                <input
                  value={form.note}
                  onChange={(event) => set("note", event.target.value)}
                  placeholder="Optional note appended to the record caveats when you change status"
                  className="input mt-2 !py-1.5 !text-[11px]"
                />
                <p className="mt-1 text-[9px] text-ink-400">
                  Publishing requires a source URL. Current state:{" "}
                  {VERIFICATION_LABELS[activeProject.verificationStatus]}.
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="record-name">Record name *</label>
                <input
                  id="record-name"
                  className="input !py-1.5 !text-[12px]"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="record-description">Description</label>
                <textarea
                  id="record-description"
                  className="input min-h-[70px] !py-1.5 !text-[12px]"
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                />
              </div>
              {text("city", "City (must match a supported city)")}
              {text("state", "State (required if city unsupported)")}
              {text("district", "District")}
              <div>
                <label className="field-label" htmlFor="record-category">Category</label>
                <select
                  id="record-category"
                  className="input !py-1.5 !text-[12px]"
                  value={form.category}
                  onChange={(event) => set("category", event.target.value as ProjectCategory)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="record-status">Project status</label>
                <select
                  id="record-status"
                  className="input !py-1.5 !text-[12px]"
                  value={form.status}
                  onChange={(event) => set("status", event.target.value as ProjectStatus)}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {text("executingDepartment", "Executing department")}
              {text("fundingAuthority", "Funding authority")}
              {text("implementingAgency", "Implementing agency")}
              {text("contractor", "Contractor")}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {numeric("approvedBudget", "Approved cost", "INR", true)}
              {numeric("revisedBudget", "Revised cost", "INR", true)}
              {numeric("expenditure", "Expenditure", "INR", true)}
              {numeric("physicalProgress", "Physical progress", "%")}
              {numeric("financialProgress", "Financial progress", "%")}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="record-start">Start date</label>
                <input id="record-start" type="date" className="input !py-1.5 !text-[12px]" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="record-expected">Expected completion</label>
                <input id="record-expected" type="date" className="input !py-1.5 !text-[12px]" value={form.expectedCompletion} onChange={(event) => set("expectedCompletion", event.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="record-actual">Actual completion</label>
                <input id="record-actual" type="date" className="input !py-1.5 !text-[12px]" value={form.actualCompletion} onChange={(event) => set("actualCompletion", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {numeric("lat", "Latitude", "6–38")}
              {numeric("lng", "Longitude", "68–98")}
              <label className="flex items-end gap-2 pb-1 text-[11px] font-semibold text-ink-600">
                <input
                  type="checkbox"
                  checked={form.coordinatesVerified}
                  onChange={(event) => set("coordinatesVerified", event.target.checked)}
                  className="h-3.5 w-3.5 accent-teal-600"
                />
                Coordinate verified against source
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {text("sourceOrganisation", "Source organisation *")}
              {text("sourceUrl", "Source URL")}
              {isCreate || activeProject?.dataClass !== "demonstration" ? (
                <div>
                  <label className="field-label" htmlFor="record-class">Data classification</label>
                  <select
                    id="record-class"
                    className="input !py-1.5 !text-[12px]"
                    value={form.dataClass}
                    onChange={(event) => set("dataClass", event.target.value as DataClass)}
                  >
                    {(["official", "imported", "admin-verified", "user-submitted"] as DataClass[]).map(
                      (value) => (
                        <option key={value} value={value}>{DATA_CLASS_LABELS[value]}</option>
                      ),
                    )}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="field-label" htmlFor="record-verification">Verification state</label>
                <select
                  id="record-verification"
                  className="input !py-1.5 !text-[12px]"
                  value={form.verificationStatus}
                  onChange={(event) =>
                    set("verificationStatus", event.target.value as VerificationStatus)
                  }
                >
                  {Object.entries(VERIFICATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="record-caveats">Caveats (one per line)</label>
              <textarea
                id="record-caveats"
                className="input min-h-[70px] !py-1.5 !text-[12px]"
                value={form.caveats}
                onChange={(event) => set("caveats", event.target.value)}
              />
            </div>
          </>
        ) : modalTab === "funding" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {numeric("fundingCentral", "Central government funding", "INR", true)}
              {numeric("fundingState", "State government funding", "INR", true)}
              {numeric("fundingMunicipal", "Municipal contribution", "INR", true)}
              {numeric("fundingOther", "Other documented funding", "INR", true)}
              {text("fundingOtherSourceLabel", "Other funding label (e.g. JICA / PPP)")}
            </div>
            <div>
              <label className="field-label" htmlFor="funding-notes">Funding notes</label>
              <textarea
                id="funding-notes"
                className="input min-h-[70px] !py-1.5 !text-[12px]"
                value={form.fundingNotes}
                onChange={(e) => set("fundingNotes", e.target.value)}
              />
            </div>
            <div className="border-t hairline pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Responsibility chain
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {text("sanctioningAuthority", "Sanctioning authority")}
                {text("tenderingAuthority", "Tendering authority")}
                {text("supervisingDepartment", "Supervising department")}
                {text("executingAgencyResp", "Executing agency")}
              </div>
            </div>
          </div>
        ) : modalTab === "documents" && activeProject ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-navy-900/10 bg-cream-50 p-3">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Attach document or source link
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title *"
                  className="input !py-1.5 !text-[11.5px]"
                />
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value as ProjectDocument["kind"])}
                  className="input !py-1.5 !text-[11.5px]"
                  aria-label="Document type"
                >
                  <option value="report">Public report</option>
                  <option value="tender">Tender record</option>
                  <option value="dpr">Detailed project report (DPR)</option>
                  <option value="notification">Government notification</option>
                  <option value="photograph">Source photograph</option>
                  <option value="other">Other document</option>
                </select>
                <input
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="https://… *"
                  className="input !py-1.5 !text-[11.5px]"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={docPublishedAt}
                    onChange={(e) => setDocPublishedAt(e.target.value)}
                    className="input !py-1.5 !text-[11.5px]"
                    aria-label="Published date"
                  />
                  <Button type="button" size="sm" loading={addingDoc} onClick={addDocument}>
                    Attach
                  </Button>
                </div>
              </div>
            </div>

            {activeProject.documents.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-400">
                No documents attached to this record yet.
              </p>
            ) : (
              <ul className="divide-y divide-navy-900/8 rounded-lg border border-navy-900/10 bg-white">
                {activeProject.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText size={14} className="shrink-0 text-teal-600" />
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-bold text-navy-900">{doc.title}</p>
                        <p className="truncate text-[9.5px] text-ink-400">
                          {doc.kind} · {doc.url}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      aria-label={`Remove ${doc.title}`}
                      icon={<Trash2 size={12} />}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : modalTab === "representatives" && activeProject ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-navy-900/10 bg-cream-50 p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                <Users size={11} /> Link representative attribution
              </p>
              <p className="mt-1 text-[10px] text-ink-500">
                Link an elected representative to this project only with a documented basis.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <select
                  value={repId}
                  onChange={(event) => setRepId(event.target.value)}
                  className="input !py-1.5 !text-[11px]"
                  aria-label="Select representative"
                >
                  <option value="">Select a representative…</option>
                  {(repsData.data?.representatives ?? []).map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.constituency} · {rep.state})
                    </option>
                  ))}
                </select>
                <select
                  value={repBasis}
                  onChange={(event) =>
                    setRepBasis(event.target.value as ConstituencyVerification)
                  }
                  className="input !py-1.5 !text-[11px]"
                  aria-label="Attribution basis"
                >
                  <option value="admin-verified">Administrator-verified source</option>
                  <option value="verified-boundary">Verified boundary match</option>
                  <option value="unverified">Unverified context</option>
                </select>
                <input
                  value={repNote}
                  onChange={(event) => setRepNote(event.target.value)}
                  placeholder="Verification note (optional)"
                  className="input !py-1.5 !text-[11px]"
                  aria-label="Representative attribution note"
                />
                <div className="flex gap-2">
                  <input
                    value={repSourceUrl}
                    onChange={(event) => setRepSourceUrl(event.target.value)}
                    placeholder="Evidence URL (https://…)"
                    className="input !py-1.5 !text-[11px]"
                    aria-label="Representative attribution source URL"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={linkingRep}
                    onClick={linkRepresentative}
                  >
                    Link
                  </Button>
                </div>
              </div>
            </div>

            {activeProject.representatives.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-400">
                No representatives linked to this project.
              </p>
            ) : (
              <ul className="divide-y divide-navy-900/8 rounded-lg border border-navy-900/10 bg-white">
                {activeProject.representatives.map((link) => {
                  const rep = repsData.data?.representatives.find(
                    (r) => r.id === link.representativeId,
                  );
                  return (
                    <li key={link.representativeId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-bold text-navy-900">
                          {rep ? `${rep.name} (${rep.constituency})` : link.representativeId}
                        </p>
                        <p className="text-[9.5px] text-ink-400">
                          {link.basis}
                          {link.note ? ` · ${link.note}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkRepresentative(link.representativeId)}
                        icon={<Unlink size={12} />}
                      >
                        Unlink
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {!isCreate && activeProject ? (
          <p className="text-[10px] text-ink-400">
            Last updated {formatDate(activeProject.lastUpdated)} · Last verified{" "}
            {activeProject.lastVerifiedAt ? formatDate(activeProject.lastVerifiedAt) : "never"} ·{" "}
            {activeProject.dataClass === "demonstration"
              ? "Demonstration record: financial claims are not real. Keep it labelled."
              : "Every correction should be supported by the cited source."}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
