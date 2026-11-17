import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Paginated, Project } from "@shared/types";
import { cityBySlug } from "@shared/cities";
import {
  CATEGORY_LABELS,
  DATA_CLASS_LABELS,
  STATUS_LABELS,
} from "@shared/format";
import {
  Badge,
  Button,
  DataProvenanceNotice,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  cn,
} from "@/components/ui";
import { ProjectCard, ProjectRow } from "@/components/ProjectCard";
import { useCity } from "@/context/CityContext";
import { useApiData } from "@/hooks/useApiData";
import { qs } from "@/services/api";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
const STATUS_OPTIONS = Object.entries(STATUS_LABELS);
const DATA_CLASS_OPTIONS = Object.entries(DATA_CLASS_LABELS);

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { city, cityName, selectCity } = useCity();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [dataClass, setDataClass] = useState(() => searchParams.get("dataClass") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") ?? "recent");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page") ?? 1) || 1));
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    if (sort && sort !== "recent") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?.slug, debouncedQ, category, status, dataClass, sort, page]);

  const activeFilters = [category, status, dataClass].filter(Boolean).length;

  const path = useMemo(
    () =>
      `/projects${qs({
        state: city?.stateSlug,
        city: city?.slug,
        q: debouncedQ,
        category,
        status,
        dataClass,
        sort,
        page,
        pageSize: view === "grid" ? 12 : 20,
      })}`,
    [city?.stateSlug, city?.slug, debouncedQ, category, status, dataClass, sort, page, view],
  );

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
    setPage(1);
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
          <>
            <Badge tone="navy">{data?.scope.official ?? 0} sourced</Badge>
            <Badge tone="gold">{data?.scope.demonstration ?? 0} demonstration</Badge>
          </>
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
                  <ProjectCard key={project.id} project={project} />
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
    </div>
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
