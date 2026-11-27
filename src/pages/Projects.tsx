import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Download,
  Filter,
  GitCompareArrows,
  LayoutGrid,
  List,
  MapPin,
  PlusCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Paginated, Project, ProjectCategory, ProjectStatus } from "@shared/types";
import { CITIES, cityBySlug } from "@shared/cities";
import {
  CATEGORY_LABELS,
  DATA_CLASS_LABELS,
  STATUS_LABELS,
  formatDate,
  formatINRCompact,
  formatPercent,
} from "@shared/format";
import {
  Badge,
  Button,
  DataClassBadge,
  DataProvenanceNotice,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
  StatusBadge,
  VerificationBadge,
  cn,
} from "@/components/ui";
import { ProjectCard, ProjectRow } from "@/components/ProjectCard";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { ApiError, apiFetch, qs } from "@/services/api";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
const STATUS_OPTIONS = Object.entries(STATUS_LABELS);
const DATA_CLASS_OPTIONS = Object.entries(DATA_CLASS_LABELS);
const STATES = [...new Set(CITIES.map((c) => c.state))].sort();

export default function ProjectsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { city, cityName, selectCity } = useCity();
  const { ids: savedIds, count: savedCount, isFollowed, toggle: toggleFollow } = useWatchlist();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [dataClass, setDataClass] = useState(() => searchParams.get("dataClass") ?? "");
  const [excludeDemo, setExcludeDemo] = useState(() => searchParams.get("includeDemo") === "false");
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get("saved") === "1");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "recent");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") ?? 1) || 1));
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareList, setCompareList] = useState<Project[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const toast = useToast();

  const cityParam = searchParams.get("city");
  useEffect(() => {
    if (!cityParam) return;
    if (cityParam === "india") {
      if (city !== null) selectCity(null);
      return;
    }
    const matched = cityBySlug(cityParam);
    if (matched && city?.slug !== matched.slug) {
      selectCity(matched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (debouncedQ !== q) {
        setDebouncedQ(q);
        setPage(1);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [q, debouncedQ]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (city?.slug) next.set("city", city.slug);
    if (debouncedQ) next.set("q", debouncedQ);
    if (category) next.set("category", category);
    if (status) next.set("status", status);
    if (dataClass) next.set("dataClass", dataClass);
    if (excludeDemo) next.set("includeDemo", "false");
    if (savedOnly) next.set("saved", "1");
    if (sort && sort !== "recent") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?.slug, debouncedQ, category, status, dataClass, excludeDemo, savedOnly, sort, page]);

  const activeFilters = [category, status, dataClass, excludeDemo ? "1" : "", savedOnly ? "1" : ""].filter(Boolean).length;

  const idsParam = savedOnly ? (savedIds.length ? savedIds.join(",") : "__none__") : undefined;

  const queryParams = useMemo(
    () => ({
      state: city?.stateSlug,
      city: city?.slug,
      q: debouncedQ,
      category,
      status,
      dataClass,
      includeDemo: excludeDemo ? "false" : undefined,
      ids: idsParam,
      sort,
    }),
    [city?.stateSlug, city?.slug, debouncedQ, category, status, dataClass, excludeDemo, idsParam, sort],
  );

  const path = useMemo(
    () =>
      `/projects${qs({
        ...queryParams,
        page,
        pageSize: view === "grid" ? 12 : 20,
      })}`,
    [queryParams, page, view],
  );

  const exportUrl = `/api/projects-export${qs({ ...queryParams, format: "csv" })}`;

  const { data, loading, error, refresh } = useApiData<
    Paginated<Project> & {
      scope: { official: number; demonstration: number; withCoordinates: number };
    }
  >(path, [path]);

  const reset = () => {
    setQ("");
    setDebouncedQ("");
    setCategory("");
    setStatus("");
    setDataClass("");
    setExcludeDemo(false);
    setSavedOnly(false);
    setPage(1);
  };

  const toggleCompare = (project: Project) => {
    setCompareList((current) => {
      if (current.some((p) => p.id === project.id)) {
        return current.filter((p) => p.id !== project.id);
      }
      if (current.length >= 3) {
        toast.push("Compare up to 3 projects", {
          description: "Remove one from the comparison bar first.",
          tone: "warning",
        });
        return current;
      }
      return [...current, project];
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        eyebrow={city ? `${city.state} · ${city.name}` : "All India"}
        title="Public infrastructure records"
        description={
          city
            ? `Projects currently in view for ${cityName}. Filter by category, status or provenance. Source and verification state are shown on every record.`
            : "Every infrastructure record currently available on the platform, with its source, provenance and verification state."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="navy">{data?.scope.official ?? 0} sourced</Badge>
            <Badge tone="gold">{data?.scope.demonstration ?? 0} demonstration</Badge>
            <a
              href={exportUrl}
              download="samaj-darpan-records.csv"
              className="btn btn-outline btn-sm"
            >
              <Download size={13} /> Export CSV
            </a>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setSubmitOpen(true)}
              icon={<PlusCircle size={13} />}
            >
              Submit record
            </Button>
          </div>
        }
      />

      <div className="container-page py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search projects, departments, contractors, IDs…"
              className="input !py-2.5 !pl-9 !pr-9 !text-sm"
              aria-label="Search projects"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-navy-900"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            icon={<Filter size={14} />}
          >
            Filters{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          <button
            type="button"
            onClick={() => {
              setExcludeDemo((v) => !v);
              setPage(1);
            }}
            className={cn(
              "rounded-lg border px-2.5 py-2 text-[11px] font-bold transition",
              excludeDemo
                ? "border-teal-500/40 bg-teal-50 text-teal-800"
                : "border-navy-900/12 bg-white text-ink-600 hover:bg-cream-50",
            )}
            aria-pressed={excludeDemo}
          >
            Sourced only
          </button>
          <button
            type="button"
            onClick={() => {
              setSavedOnly((v) => !v);
              setPage(1);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold transition",
              savedOnly
                ? "border-navy-900 bg-navy-900 text-cream-50"
                : "border-navy-900/12 bg-white text-ink-600 hover:bg-cream-50",
            )}
            aria-pressed={savedOnly}
          >
            <Bookmark size={12} /> Saved ({savedCount})
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="input !w-auto !py-2 !text-[12px]"
              aria-label="Sort projects"
            >
              <option value="recent">Recently updated</option>
              <option value="name">Name A–Z</option>
              <option value="budget">Largest approved cost</option>
              <option value="progress">Physical progress</option>
            </select>
            <div className="flex rounded-lg border border-navy-900/12 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-md p-1.5",
                  view === "grid" ? "bg-navy-900 text-white" : "text-ink-400 hover:text-navy-900",
                )}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "rounded-md p-1.5",
                  view === "list" ? "bg-navy-900 text-white" : "text-ink-400 hover:text-navy-900",
                )}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
          <aside
            className={cn(
              "card h-fit p-4 lg:sticky lg:top-[136px]",
              filtersOpen ? "block" : "hidden lg:block",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
                <SlidersHorizontal size={13} /> Filters
              </p>
              {activeFilters > 0 || q ? (
                <button
                  type="button"
                  onClick={reset}
                  className="text-[10px] font-bold text-teal-700 hover:text-teal-600"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            <FilterGroup label="Category">
              <FilterRadio
                label="All categories"
                checked={!category}
                onChange={() => { setCategory(""); setPage(1); }}
              />
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <FilterRadio
                  key={value}
                  label={label}
                  checked={category === value}
                  onChange={() => { setCategory(value); setPage(1); }}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Status">
              <FilterRadio
                label="All statuses"
                checked={!status}
                onChange={() => { setStatus(""); setPage(1); }}
              />
              {STATUS_OPTIONS.map(([value, label]) => (
                <FilterRadio
                  key={value}
                  label={label}
                  checked={status === value}
                  onChange={() => { setStatus(value); setPage(1); }}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Provenance">
              <FilterRadio
                label="All records"
                checked={!dataClass}
                onChange={() => { setDataClass(""); setPage(1); }}
              />
              {DATA_CLASS_OPTIONS.map(([value, label]) => (
                <FilterRadio
                  key={value}
                  label={value === "demonstration" ? "Demonstration only" : label}
                  checked={dataClass === value}
                  onChange={() => { setDataClass(value); setPage(1); }}
                />
              ))}
            </FilterGroup>

            <div className="mt-4 rounded-lg bg-cream-50 p-2.5 text-[9.5px] leading-relaxed text-ink-400">
              <MapPin size={11} className="mb-1 inline" /> {city ? cityName : "All India"} ·
              filters apply to the selected location.
            </div>
          </aside>

          <div className="min-w-0">
            {data && data.scope.demonstration > 0 ? (
              <DataProvenanceNotice
                compact
                counts={[
                  { dataClass: "demonstration", count: data.scope.demonstration },
                  { dataClass: "imported", count: data.scope.official },
                ]}
                className="mb-4"
              />
            ) : null}

            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] text-ink-500">
                {loading ? "Searching…" : `${data?.total ?? 0} record${data?.total === 1 ? "" : "s"}`}
                {debouncedQ ? <> for “{debouncedQ}”</> : null}
              </p>
              {data ? (
                <p className="text-[10px] text-ink-400">
                  Page {data.page} of {totalPages}
                </p>
              ) : null}
            </div>

            {loading ? (
              <LoadingBlock rows={4} />
            ) : error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                icon={<Search size={20} />}
                title="No records match this search"
                description="Try a broader search, clear the filters, or choose a different city. The platform only shows records that exist in the current dataset."
                action={
                  <Button variant="outline" onClick={reset} icon={<X size={14} />}>
                    Clear filters
                  </Button>
                }
              />
            ) : view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    followed={isFollowed(project.id)}
                    onToggleFollow={toggleFollow}
                    compared={compareList.some((p) => p.id === project.id)}
                    onToggleCompare={toggleCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="card px-4 py-1">
                {data.items.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </div>
            )}

            {data && totalPages > 1 ? (
              <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  icon={<ArrowLeft size={13} />}
                >
                  Previous
                </Button>
                <span className="px-2 text-[11px] font-semibold text-ink-500">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  iconRight={<ArrowRight size={13} />}
                >
                  Next
                </Button>
              </nav>
            ) : null}

            <div className="mt-6 rounded-xl border border-navy-900/10 bg-white p-4">
              <p className="text-[11px] font-bold text-navy-900">Looking for something specific?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                Use the map to filter by location, or open a city dashboard for aggregated
                statistics and elected representatives.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/map" className="btn btn-outline btn-sm">Open map explorer</Link>
                <Link to="/sources" className="btn btn-ghost btn-sm">Check source coverage</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {compareList.length > 0 ? (
        <div className="sticky bottom-4 z-30 mx-auto max-w-4xl px-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-900/15 bg-navy-950 px-4 py-3 text-cream-50 shadow-lift">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-400">
                <GitCompareArrows size={13} /> Compare ({compareList.length}/3)
              </span>
              {compareList.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold"
                >
                  <span className="max-w-[160px] truncate">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleCompare(p)}
                    aria-label={`Remove ${p.name}`}
                    className="rounded-full p-0.5 hover:bg-white/20"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompareList([])}
                className="text-[11px] font-semibold text-cream-50/70 hover:text-cream-50"
              >
                Clear
              </button>
              <Button
                size="sm"
                variant="gold"
                disabled={compareList.length < 2}
                onClick={() => setCompareOpen(true)}
              >
                Compare {compareList.length} records
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {compareOpen ? (
        <CompareModal
          projects={compareList}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => setCompareList((c) => c.filter((p) => p.id !== id))}
        />
      ) : null}

      {submitOpen ? (
        <SubmitProjectModal
          isSignedIn={Boolean(user)}
          defaultState={city?.state ?? ""}
          defaultCity={city?.name ?? ""}
          onClose={() => setSubmitOpen(false)}
          onCreated={() => {
            setSubmitOpen(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CompareModal({
  projects,
  onClose,
  onRemove,
}: {
  projects: Project[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const rows: { label: string; render: (p: Project) => React.ReactNode }[] = [
    { label: "Location", render: (p) => [p.city, p.state].filter(Boolean).join(", ") || "—" },
    { label: "Status", render: (p) => <StatusBadge status={p.status} /> },
    { label: "Provenance", render: (p) => <DataClassBadge dataClass={p.dataClass} /> },
    { label: "Verification", render: (p) => <VerificationBadge status={p.verificationStatus} /> },
    {
      label: "Approved / revised cost",
      render: (p) => formatINRCompact(p.revisedBudget ?? p.approvedBudget) ?? "Not published",
    },
    {
      label: "Documented expenditure",
      render: (p) => formatINRCompact(p.expenditure) ?? "Not published",
    },
    {
      label: "Physical progress",
      render: (p) => formatPercent(p.physicalProgress) ?? "Not published",
    },
    {
      label: "Timeline",
      render: (p) =>
        p.startDate || p.expectedCompletion || p.actualCompletion
          ? `${p.startDate ? formatDate(p.startDate) : "?"} → ${
              p.actualCompletion
                ? formatDate(p.actualCompletion)
                : p.expectedCompletion
                  ? formatDate(p.expectedCompletion)
                  : "?"
            }`
          : "Not published",
    },
    { label: "Executing department", render: (p) => p.executingDepartment ?? "Not published" },
    { label: "Contractor", render: (p) => p.contractor ?? "Not published" },
    { label: "Source", render: (p) => p.sourceOrganisation },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="Compare infrastructure records"
      description="Side-by-side comparison of documented fields. Missing fields are never estimated."
      width="xl"
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-[11.5px]">
          <thead>
            <tr className="border-b hairline">
              <th className="w-40 py-2 pr-3 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
                Field
              </th>
              {projects.map((p) => (
                <th key={p.id} className="min-w-[180px] px-3 py-2 align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/projects/${p.id}`}
                      onClick={onClose}
                      className="font-display text-sm text-navy-900 hover:text-teal-700"
                    >
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(p.id);
                        if (projects.length <= 2) onClose();
                      }}
                      className="rounded p-0.5 text-ink-400 hover:text-navy-900"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900/8">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-2.5 pr-3 font-bold text-ink-500">{row.label}</td>
                {projects.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-ink-700">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function SubmitProjectModal({
  isSignedIn,
  defaultState,
  defaultCity,
  onClose,
  onCreated,
}: {
  isSignedIn: boolean;
  defaultState: string;
  defaultCity: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    state: defaultState,
    city: defaultCity,
    district: "",
    category: "roads" as ProjectCategory,
    status: "ongoing" as ProjectStatus,
    description: "",
    executingDepartment: "",
    contractor: "",
    approvedBudgetCrore: "",
    sourceOrganisation: "",
    sourceUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const citiesForState = useMemo(
    () =>
      form.state
        ? CITIES.filter((c) => c.state === form.state).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [form.state],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.name.trim().length < 3) {
      setError("Enter a project name of at least 3 characters.");
      return;
    }
    if (!form.state) {
      setError("Select the state.");
      return;
    }
    if (form.description.trim().length < 20) {
      setError("Describe the project and source context in at least 20 characters.");
      return;
    }
    if (!form.sourceOrganisation.trim()) {
      setError("Name the cited source organisation.");
      return;
    }
    if (!/^https?:\/\//i.test(form.sourceUrl.trim())) {
      setError("Provide a valid http:// or https:// source URL.");
      return;
    }
    const budget = form.approvedBudgetCrore.trim()
      ? Number(form.approvedBudgetCrore)
      : null;
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
      setError("Approved cost must be a positive number in crore.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/submissions/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          state: form.state,
          city: form.city || undefined,
          district: form.district.trim() || undefined,
          category: form.category,
          status: form.status,
          description: form.description.trim(),
          executingDepartment: form.executingDepartment.trim() || undefined,
          contractor: form.contractor.trim() || undefined,
          approvedBudgetCrore: budget,
          sourceOrganisation: form.sourceOrganisation.trim(),
          sourceUrl: form.sourceUrl.trim(),
        }),
      });
      toast.push("Record submitted for review", {
        description: "Labelled Citizen-submitted and placed in the verification queue.",
        tone: "success",
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit this record.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Submit a public project record"
      description="Citizen submissions require a public source URL, carry a Citizen-submitted badge, and await administrator verification."
      width="lg"
      footer={
        isSignedIn ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={submitting}>Submit for review</Button>
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )
      }
    >
      {!isSignedIn ? (
        <div className="py-4 text-center">
          <p className="text-sm font-semibold text-navy-900">
            Sign in to contribute a source-backed project record
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Every citizen submission is attributed to a verified account and enters the
            administrator review queue.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to={`/login?next=${encodeURIComponent("/projects")}`} className="btn btn-primary btn-sm">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-outline btn-sm">
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error ? (
            <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="sub-name" className="field-label">Project title *</label>
            <input
              id="sub-name"
              className="input !py-2 !text-[12px]"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ring Road Grade Separator at Sector 14"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="sub-state" className="field-label">State *</label>
              <select
                id="sub-state"
                className="input !py-2 !text-[12px]"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, city: "" }))}
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-city" className="field-label">City</label>
              <select
                id="sub-city"
                className="input !py-2 !text-[12px]"
                value={form.city}
                disabled={!form.state}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              >
                <option value="">State-level / other</option>
                {citiesForState.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-district" className="field-label">District</label>
              <input
                id="sub-district"
                className="input !py-2 !text-[12px]"
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="sub-cat" className="field-label">Category</label>
              <select
                id="sub-cat"
                className="input !py-2 !text-[12px]"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProjectCategory }))}
              >
                {CATEGORY_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-status" className="field-label">Status</label>
              <select
                id="sub-status"
                className="input !py-2 !text-[12px]"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
              >
                {STATUS_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-budget" className="field-label">Approved cost (₹ crore)</label>
              <input
                id="sub-budget"
                inputMode="decimal"
                className="input !py-2 !text-[12px]"
                value={form.approvedBudgetCrore}
                onChange={(e) => setForm((f) => ({ ...f, approvedBudgetCrore: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label htmlFor="sub-desc" className="field-label">Description *</label>
            <textarea
              id="sub-desc"
              className="input min-h-[80px] !py-2 !text-[12px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Summarise what the cited document states (scope, length, sanction date)."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sub-dept" className="field-label">Executing department</label>
              <input
                id="sub-dept"
                className="input !py-2 !text-[12px]"
                value={form.executingDepartment}
                onChange={(e) => setForm((f) => ({ ...f, executingDepartment: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="sub-contractor" className="field-label">Contractor (if named at source)</label>
              <input
                id="sub-contractor"
                className="input !py-2 !text-[12px]"
                value={form.contractor}
                onChange={(e) => setForm((f) => ({ ...f, contractor: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="sub-org" className="field-label">Source organisation *</label>
              <input
                id="sub-org"
                className="input !py-2 !text-[12px]"
                value={form.sourceOrganisation}
                onChange={(e) => setForm((f) => ({ ...f, sourceOrganisation: e.target.value }))}
                placeholder="e.g. Press Information Bureau / Municipal portal"
              />
            </div>
            <div>
              <label htmlFor="sub-url" className="field-label">Source URL *</label>
              <input
                id="sub-url"
                className="input !py-2 !text-[12px]"
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-4 border-t hairline pt-3">
      <legend className="text-[9.5px] font-bold uppercase tracking-[0.13em] text-ink-400">
        {label}
      </legend>
      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">{children}</div>
    </fieldset>
  );
}

function FilterRadio({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[11px] text-ink-600 hover:bg-cream-50">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-3 w-3 accent-teal-600"
      />
      <span className={checked ? "font-bold text-navy-900" : ""}>{label}</span>
    </label>
  );
}
