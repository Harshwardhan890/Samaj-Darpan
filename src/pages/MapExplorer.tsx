import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Filter,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type { Paginated, Project } from "@shared/types";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatINRCompact,
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
import { CategoryIcon, ProjectRow } from "@/components/ProjectCard";
import { MapViewportController, STATUS_COLORS, projectMarkerIcon } from "@/components/maps";
import { useCity } from "@/context/CityContext";
import { useApiData } from "@/hooks/useApiData";
import { qs } from "@/services/api";

export default function MapExplorerPage() {
  const { city, cityName } = useCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "");
  const [showDemo, setShowDemo] = useState(() => searchParams.get("demo") === "1");
  const [showBoundaries, setShowBoundaries] = useState(
    () => searchParams.get("boundaries") !== "0",
  );
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("selected"),
  );

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (status) next.set("status", status);
    if (showDemo) next.set("demo", "1");
    if (!showBoundaries) next.set("boundaries", "0");
    if (selectedId) next.set("selected", selectedId);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, status, showDemo, showBoundaries, selectedId]);

  const { data, loading, error, refresh } = useApiData<
    Paginated<Project> & {
      scope: { official: number; demonstration: number; withCoordinates: number };
    }
  >(
    `/projects${qs({
      state: city?.stateSlug,
      city: city?.slug,
      pageSize: 100,
      sort: "recent",
    })}`,
    [city?.slug],
  );

  const geoData = useApiData<GeoJSON.FeatureCollection>("/geo/constituencies");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.items ?? []).filter((project) => {
      if (!showDemo && project.dataClass === "demonstration") return false;
      if (category && project.category !== category) return false;
      if (status && project.status !== status) return false;
      if (!needle) return true;
      return [
        project.name,
        project.city,
        project.state,
        project.district,
        project.executingDepartment,
        project.contractor,
        project.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data?.items, q, category, status, showDemo]);

  const mapped = useMemo(
    () =>
      filtered.filter(
        (p) =>
          p.lat !== null &&
          p.lng !== null &&
          (p.coordinatesVerified || p.dataClass === "demonstration"),
      ),
    [filtered],
  );
  const unmapped = filtered.length - mapped.length;
  const awaitingCoordinateCheck = filtered.filter(
    (p) =>
      p.lat !== null &&
      p.lng !== null &&
      !p.coordinatesVerified &&
      p.dataClass !== "demonstration",
  ).length;
  const demoCount = (data?.items ?? []).filter(
    (p) => p.dataClass === "demonstration",
  ).length;

  const selected = filtered.find((p) => p.id === selectedId) ?? null;
  const center: [number, number] = city
    ? [city.lat, city.lng]
    : [22.5, 79.5];
  const zoom = city ? 11 : 4;

  return (
    <div>
      <PageHeader
        eyebrow={city ? `${city.state} · ${city.name}` : "All India"}
        title="Map explorer"
        description="Plot sourced project records by their published location. Records without a published coordinate are listed but never guessed onto the map."
        actions={
          <>
            <Badge tone="navy">
              <MapPin size={11} /> {mapped.length} mapped
            </Badge>
            <Badge tone="gold">{demoCount} demonstration</Badge>
          </>
        }
      />

      <div className="container-page py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search projects, contractors, IDs…"
              className="input !py-2.5 !pl-9 !pr-9 !text-sm"
              aria-label="Search mapped projects"
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

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="input !w-auto !py-2 !text-[12px]"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="input !w-auto !py-2 !text-[12px]"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gold-500/35 bg-gold-100/60 px-2.5 py-2 text-[11px] font-semibold text-[#6b5412]">
            <input
              type="checkbox"
              checked={showDemo}
              onChange={(event) => setShowDemo(event.target.checked)}
              className="h-3.5 w-3.5 accent-gold-500"
            />
            Show demonstration markers
          </label>

          {geoData.data ? (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-50/70 px-2.5 py-2 text-[11px] font-semibold text-teal-800">
              <input
                type="checkbox"
                checked={showBoundaries}
                onChange={(event) => setShowBoundaries(event.target.checked)}
                className="h-3.5 w-3.5 accent-teal-600"
              />
              Constituency boundaries
            </label>
          ) : null}

          <div className="ml-auto flex rounded-lg border border-navy-900/12 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold",
                view === "map"
                  ? "bg-navy-900 text-white"
                  : "text-ink-500 hover:text-navy-900",
              )}
              aria-pressed={view === "map"}
            >
              <Layers size={13} /> Map
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold",
                view === "list"
                  ? "bg-navy-900 text-white"
                  : "text-ink-500 hover:text-navy-900",
              )}
              aria-pressed={view === "list"}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>

        {demoCount > 0 ? (
          <DataProvenanceNotice
            compact
            className="mb-4"
            counts={[
              { dataClass: "demonstration", count: demoCount },
              {
                dataClass: "imported",
                count: (data?.items ?? []).length - demoCount,
              },
            ]}
          />
        ) : null}

        {loading ? (
          <LoadingBlock rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="card flex max-h-[680px] flex-col overflow-hidden">
              <div className="border-b hairline px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-500">
                  {filtered.length} record{filtered.length === 1 ? "" : "s"} in view
                </p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  {mapped.length} plotted · {unmapped} not plotted
                  {awaitingCoordinateCheck > 0
                    ? ` · ${awaitingCoordinateCheck} awaiting coordinate verification`
                    : ""}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {filtered.length === 0 ? (
                  <EmptyState
                    className="my-4"
                    icon={<Filter size={18} />}
                    title="No records match"
                    description="Clear the search or filters, or turn on demonstration records."
                  />
                ) : (
                  <ul className="space-y-1">
                    {filtered.map((project) => {
                      const hasPoint =
                        project.lat !== null &&
                        project.lng !== null &&
                        (project.coordinatesVerified ||
                          project.dataClass === "demonstration");
                      return (
                        <li key={project.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(project.id)}
                            className={cn(
                              "w-full rounded-lg border px-2.5 py-2 text-left transition",
                              selectedId === project.id
                                ? "border-teal-500/40 bg-teal-50/60"
                                : "border-transparent hover:bg-cream-50",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={cn(
                                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                                  hasPoint
                                    ? "bg-cream-100 text-ink-600"
                                    : "bg-amber-50 text-amber-700",
                                )}
                              >
                                {hasPoint ? (
                                  <CategoryIcon category={project.category} size={12} />
                                ) : (
                                  <MapPin size={12} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-[11.5px] font-bold text-navy-900">
                                  {project.name}
                                </span>
                                <span className="mt-0.5 block truncate text-[9.5px] text-ink-400">
                                  {project.city ?? project.state} ·{" "}
                                  {STATUS_LABELS[project.status]}
                                  {project.dataClass === "demonstration"
                                    ? " · demo, approximate"
                                    : hasPoint
                                      ? ""
                                      : " · coordinate awaiting verification"}
                                </span>
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>

            <div className="space-y-3">
              {view === "map" ? (
                <div className="overflow-hidden rounded-xl border border-navy-900/10">
                  <MapContainer
                    key={city?.slug ?? "india"}
                    center={center}
                    zoom={zoom}
                    scrollWheelZoom
                    style={{ height: 560, width: "100%" }}
                  >
                    <MapViewportController
                      center={center}
                      zoom={zoom}
                      selectedProject={selected}
                    />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {showBoundaries && geoData.data ? (
                      <GeoJSON
                        key={`boundaries-${geoData.data.features?.length ?? 0}`}
                        data={geoData.data}
                        style={{
                          color: "#0e7c7b",
                          weight: 1.5,
                          dashArray: "4 4",
                          fillColor: "#149a97",
                          fillOpacity: 0.05,
                        }}
                        onEachFeature={(feature, layer) => {
                          const props = (feature.properties ?? {}) as Record<string, unknown>;
                          const name = String(
                            props.name ?? props.pc_name ?? props.constituency ?? "Constituency",
                          );
                          const house = props.house ? ` (${String(props.house)})` : "";
                          const stateName = props.state ? ` · ${String(props.state)}` : "";
                          layer.bindTooltip(`${name}${house}${stateName}`, { sticky: true });
                        }}
                      />
                    ) : null}
                    {mapped.map((project) => (
                      <Marker
                        key={project.id}
                        position={[project.lat!, project.lng!]}
                        icon={projectMarkerIcon(project)}
                        eventHandlers={{ click: () => setSelectedId(project.id) }}
                      >
                        <Popup>
                          <div className="min-w-[200px]">
                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-teal-700">
                              {project.city ?? project.state}
                            </p>
                            <p className="mt-0.5 text-[12px] font-bold leading-snug text-navy-900">
                              {project.name}
                            </p>
                            <p className="mt-1 text-[10px] text-ink-500">
                              {STATUS_LABELS[project.status]}
                              {project.dataClass === "demonstration"
                                ? " · Demonstration record, approximate location"
                                : project.coordinatesVerified
                                  ? " · Coordinate from source"
                                  : " · Coordinate not verified"}
                            </p>
                            <Link
                              to={`/projects/${project.id}`}
                              className="mt-1.5 inline-block text-[10px] font-bold text-teal-700"
                            >
                              Open project →
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="card px-4 py-1">
                  {filtered.length === 0 ? (
                    <EmptyState
                      className="my-4"
                      title="No records match"
                      description="Adjust the filters to see project records."
                    />
                  ) : (
                    filtered.map((project) => (
                      <ProjectRow key={project.id} project={project} />
                    ))
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-navy-900/10 bg-cream-50 px-3.5 py-2 text-[10px] font-semibold text-ink-600">
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                  Legend
                </span>
                {(["ongoing", "completed", "delayed", "planned"] as const).map((st) => (
                  <span key={st} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-white shadow-xs"
                      style={{ background: STATUS_COLORS[st] }}
                    />
                    {STATUS_LABELS[st]}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-dashed border-white bg-gold-500 opacity-80" />
                  Demo (approx.)
                </span>
                {geoData.data ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-4 border border-dashed border-teal-600 bg-teal-500/10" />
                    Constituency boundary
                  </span>
                ) : null}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-navy-900/10 bg-white px-3.5 py-2.5 text-[10.5px] leading-relaxed text-ink-500">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <p>
                  Records with no publication-verified coordinate are never plotted.
                  Imported coordinates stay off the map until an administrator checks them
                  against the cited source. Demonstration markers are hidden by default
                  because their coordinates are illustrative. Map tiles: OpenStreetMap
                  contributors.
                </p>
              </div>

              {selected ? (
                <div className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-teal-700">
                        Selected record
                      </p>
                      <h3 className="mt-0.5 font-display text-lg leading-tight text-navy-900">
                        {selected.name}
                      </h3>
                      <p className="mt-1 text-[10.5px] text-ink-500">
                        {selected.city ?? selected.state}
                        {selected.lat !== null &&
                        selected.lng !== null &&
                        (selected.coordinatesVerified ||
                          selected.dataClass === "demonstration")
                          ? ` · ${selected.dataClass === "demonstration" ? "approximate " : ""}${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
                          : selected.lat !== null
                            ? " · Coordinate awaiting verification, not plotted"
                            : " · No published coordinate"}
                      </p>
                    </div>
                    <Link
                      to={`/projects/${selected.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      Open record <ArrowUpRight size={12} />
                    </Link>
                  </div>
                  <div className="mt-3 grid gap-3 border-t hairline pt-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                        Approved cost
                      </p>
                      <p className="mt-0.5 text-[12px] font-bold text-navy-900">
                        {formatINRCompact(selected.revisedBudget ?? selected.approvedBudget) ??
                          "Not published"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                        Executing department
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-ink-700">
                        {selected.executingDepartment ?? "Not published"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                        Source
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-ink-700">
                        {selected.sourceOrganisation}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-900/10 bg-white p-4">
          <p className="flex items-center gap-2 text-[11.5px] text-ink-500">
            <Building2 size={15} className="text-teal-600" />
            Viewing {cityName}. Change location from the header to update the map.
          </p>
          <div className="flex gap-2">
            <Link to="/sources" className="btn btn-outline btn-sm">
              Source coverage
            </Link>
            <Link to="/projects" className="btn btn-ghost btn-sm">
              Grid view
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
