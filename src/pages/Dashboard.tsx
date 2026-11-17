import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  Landmark,
  Map,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type {
  City,
  DashboardStats,
  Project,
  Representative,
} from "@shared/types";
import { CITIES, POPULAR_CITIES } from "@shared/cities";
import {
  formatINRCompact,
  formatPercent,
  relativeDate,
} from "@shared/format";
import {
  Badge,
  DataProvenanceNotice,
  EmptyState,
  ErrorState,
  LoadingBlock,
  SectionHeading,
  SourceLine,
  Stat,
  cn,
} from "@/components/ui";
import {
  BudgetByYearChart,
  BudgetComparison,
  CategoryChart,
  ChartCard,
  DepartmentBars,
  ProvenanceStrip,
  ResolutionGauge,
  StatusDonut,
} from "@/components/charts";
import { ProjectRow } from "@/components/ProjectCard";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { useCity } from "@/context/CityContext";
import { useApiData } from "@/hooks/useApiData";
import { qs } from "@/services/api";

interface DashboardResponse {
  scope: { stateSlug: string | null; citySlug: string | null; cityName: string };
  stats: DashboardStats;
  representatives: Representative[];
  recentProjects: Project[];
  sources: { sourceId: string; status: string; finishedAt: string; message: string }[];
}

export default function DashboardPage({ cityOverride }: { cityOverride?: City | null }) {
  const { city: contextCity, selectCity } = useCity();
  const city = cityOverride !== undefined ? cityOverride : contextCity;
  const scope = city
    ? qs({ state: city.stateSlug, city: city.slug })
    : "";
  const { data, loading, error, refresh } = useApiData<DashboardResponse>(
    `/dashboard${scope}`,
    [city?.slug],
  );

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <LoadingBlock className="mt-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error ?? "Could not load this dashboard."} onRetry={refresh} />
      </div>
    );
  }

  const { stats, representatives } = data;
  const isNational = !city;
  const demoCount = stats.byProvenance.find((p) => p.dataClass === "demonstration")?.count ?? 0;
  const officialCount = stats.totalProjects - demoCount;
  const financialCoverage =
    stats.totalProjects === 0 ? null : Math.round((stats.projectsWithFinancials / stats.totalProjects) * 1000) / 10;
  const coordinateCoverage =
    stats.totalProjects === 0 ? null : Math.round((stats.projectsWithCoordinates / stats.totalProjects) * 1000) / 10;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-950 text-cream-50">
        <img
          src="/images/atal-setu.jpg"
          alt="Atal Setu, Mumbai — representative public infrastructure"
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-center opacity-35 lg:w-[62%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/95 to-navy-950/35" />
        <div className="absolute inset-0 navy-grid opacity-30" />
        <div className="container-page relative z-10 pb-0 pt-9">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cream-50/45">
            <Link to="/" onClick={() => selectCity(null)} className="hover:text-teal-400">India</Link>
            {city ? (
              <>
                <span>/</span>
                <span>{city.state}</span>
                <span>/</span>
                <span className="text-cream-50/80">{city.name}</span>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <span className="h-px w-7 bg-teal-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
              {isNational ? "National civic infrastructure intelligence" : `${city.state} · city dashboard`}
            </p>
          </div>

          <h1 className="mt-3 max-w-3xl text-[2.35rem] leading-[1.02] text-cream-50 sm:text-[3.1rem]">
            {isNational ? (
              <>Public infrastructure,<br className="hidden sm:block" /> in public view.</>
            ) : (
              <>{city.name} infrastructure,<br className="hidden sm:block" /> in public view.</>
            )}
          </h1>

          <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-cream-50/60">
            {isNational
              ? "Select a city to follow public projects, documented expenditure, executing departments and the elected representatives for that area."
              : `Sourced project records for ${city.name}. Examine what is published, who is responsible, and where the public record is incomplete.`}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to={`/projects${city ? `?city=${city.slug}` : ""}`}
              className="btn btn-gold"
            >
              Explore projects <ArrowRight size={15} />
            </Link>
            <Link to="/map" className="btn border border-white/20 bg-white/5 text-cream-50 hover:bg-white/10">
              <Map size={15} /> Open map
            </Link>
            {isNational ? (
              <button
                type="button"
                onClick={() => {
                  const popular = POPULAR_CITIES[0];
                  selectCity(popular);
                }}
                className="btn btn-ghost text-cream-50/70 hover:bg-white/10 hover:text-cream-50"
              >
                <MapPin size={14} /> Try a city
              </button>
            ) : null}
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 py-6 sm:grid-cols-4">
            <HeroStat label="Public records" value={stats.totalProjects} note={`${officialCount} sourced · ${demoCount} demo`} />
            <HeroStat
              label="Documented approved cost"
              value={formatINRCompact(stats.documentedBudget) ?? "—"}
              note={stats.projectsWithFinancials ? `${stats.projectsWithFinancials} records with financial data` : "No financial records yet"}
            />
            <HeroStat
              label="Ongoing / delayed"
              value={`${stats.ongoing} / ${stats.delayed}`}
              note={`${stats.completed} completed · ${stats.planned} planned`}
            />
            <HeroStat
              label="Citizen complaints"
              value={stats.complaints}
              note={stats.complaintResolutionRate === null ? "No complaints filed yet" : `${formatPercent(stats.complaintResolutionRate)} resolved`}
            />
          </dl>
        </div>
      </section>

      <div className="container-page space-y-8 py-8">
        {demoCount > 0 ? (
          <DataProvenanceNotice counts={stats.byProvenance} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/20 bg-teal-50/50 px-4 py-3">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-teal-800">
              <ShieldCheck size={15} /> All {stats.totalProjects} records in this view are
              sourced public records, each with its provenance shown.
            </p>
            <Link to="/sources" className="text-[11px] font-bold text-teal-700 hover:text-teal-600">
              Data sources →
            </Link>
          </div>
        )}

        {/* ── Stat row ──────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total records"
            value={stats.totalProjects}
            detail={`${stats.projectsWithCoordinates} with published coordinates`}
            icon={<Database size={16} />}
          />
          <Stat
            label="Documented expenditure"
            value={stats.documentedExpenditure === null ? "—" : formatINRCompact(stats.documentedExpenditure)}
            detail={stats.documentedExpenditure === null ? "Not published for these records" : "Sum of published expenditure figures"}
            icon={<TrendingUp size={16} />}
            tone="teal"
          />
          <Stat
            label="Delayed or stalled"
            value={stats.delayed}
            detail={stats.delayed === 0 ? "No documented delays in this view" : "As recorded by the cited source"}
            icon={<AlertTriangle size={16} />}
            tone={stats.delayed > 0 ? "amber" : "neutral"}
          />
          <Stat
            label="Complaint resolution"
            value={stats.complaintResolutionRate === null ? "—" : formatPercent(stats.complaintResolutionRate)}
            detail={`${stats.resolvedComplaints} of ${stats.complaints} citizen reports resolved`}
            icon={<CheckCircle2 size={16} />}
            tone="green"
          />
        </div>

        {/* ── Charts ────────────────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="What the record shows"
            title={isNational ? "National infrastructure at a glance" : `${city.name} at a glance`}
            description="Counts come from the records currently in view. Financial charts appear only where the underlying record publishes a figure."
            action={
              <Link to={`/projects${city ? `?city=${city.slug}` : ""}`} className="btn btn-outline btn-sm">
                <Search size={14} /> Browse records
              </Link>
            }
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <ChartCard
              className="lg:col-span-2"
              title="Approved cost by start year"
              subtitle="Only records publishing both a start date and approved cost. No interpolation."
              icon={<TrendingUp size={16} className="text-teal-600" />}
            >
              <BudgetByYearChart stats={stats} />
            </ChartCard>
            <ChartCard
              title="Project status"
              subtitle="As published at source"
              icon={<CheckCircle2 size={16} className="text-teal-600" />}
            >
              <StatusDonut stats={stats} />
            </ChartCard>
            <ChartCard
              title="Project categories"
              subtitle="Platform taxonomy applied to source records"
              icon={<Building2 size={16} className="text-teal-600" />}
            >
              <CategoryChart stats={stats} />
            </ChartCard>
            <ChartCard
              title="Implementing departments"
              subtitle="Where a department is named at source"
              icon={<Landmark size={16} className="text-teal-600" />}
            >
              <DepartmentBars stats={stats} />
            </ChartCard>
            <ChartCard
              title="Budget vs expenditure"
              subtitle="Documented figures only"
              icon={<FileCheck2 size={16} className="text-teal-600" />}
            >
              <BudgetComparison stats={stats} />
            </ChartCard>
          </div>
        </section>

        {/* ── Projects + right rail ─────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="card p-5">
            <SectionHeading
              title={isNational ? "Sourced public records" : `Projects in ${city.name}`}
              description="Newest source updates first. Demonstration records are excluded from this list."
              action={
                <Link
                  to={`/projects${city ? `?city=${city.slug}` : ""}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-600"
                >
                  View all <ArrowRight size={12} />
                </Link>
              }
            />
            <div className="mt-3">
              {data.recentProjects.length > 0 ? (
                data.recentProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))
              ) : (
                <EmptyState
                  className="mt-3"
                  icon={<FileCheck2 size={19} />}
                  title="No sourced records yet"
                  description={
                    isNational
                      ? "Import a public dataset from the admin console or configure a data source to populate this view."
                      : `No sourced project records for ${city?.name} yet. Import a city dataset or select another city.`
                  }
                  action={
                    <Link to="/projects" className="btn btn-outline btn-sm">
                      See demonstration records
                    </Link>
                  }
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[1.05rem]">Record coverage</h3>
                <Badge tone="neutral">This view</Badge>
              </div>
              <div className="mt-4 space-y-4">
                <CoverageBar label="Financial information" value={financialCoverage} />
                <CoverageBar label="Published coordinates" value={coordinateCoverage} />
                <CoverageBar
                  label="Citizen complaint resolution"
                  value={stats.complaintResolutionRate}
                  emptyLabel="No complaints"
                />
              </div>
              <p className="mt-4 border-t hairline pt-3 text-[10px] leading-relaxed text-ink-400">
                Missing fields are never estimated. Coverage shows the share of records
                where a value is actually published.
              </p>
            </div>

            <div className="card p-5">
              <h3 className="font-display text-[1.05rem]">Data provenance</h3>
              <p className="mt-1 text-[11px] text-ink-400">
                Not all records carry the same evidentiary weight.
              </p>
              <div className="mt-4">
                <ProvenanceStrip stats={stats} />
              </div>
              <Link
                to="/methodology"
                className="mt-4 flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-600"
              >
                Read the methodology <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Representatives ───────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Political accountability"
            title={isNational ? "Elected representatives" : `Elected representatives for ${city.name}`}
            description="Representation is geographic. These officials are not automatically responsible for any individual project shown here."
            action={
              <Link to="/representatives" className="btn btn-outline btn-sm">
                <Users size={14} /> Full directory
              </Link>
            }
          />
          {representatives.length > 0 ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {representatives.slice(0, 4).map((rep) => (
                  <RepresentativeCard key={rep.id} representative={rep} compact />
                ))}
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-50/60 px-3 py-2 text-[10.5px] leading-relaxed text-[#6b5412]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Representative records are shown with their last verification date. Samaj
                Darpan does not infer project responsibility from geography. Constituency
                mapping for individual projects is marked unverified unless an
                administrator has checked it.
              </p>
            </>
          ) : (
            <EmptyState
              className="mt-4"
              icon={<Users size={19} />}
              title="No verified representative records for this location"
              description="The platform only displays elected-representative records that carry a public source. It does not guess officeholders."
            />
          )}
        </section>

        {/* ── National city explorer ────────────────────────────────── */}
        {isNational ? (
          <section>
            <SectionHeading
              eyebrow="Choose a city"
              title="Explore the national platform"
              description={`${CITIES.length} cities across four regions. City selection changes projects, statistics, complaints, contractors and representatives everywhere.`}
            />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {POPULAR_CITIES.map((popular) => (
                <Link
                  key={popular.id}
                  to={`/cities/${popular.stateSlug}/${popular.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-navy-900/10 bg-white px-3.5 py-3 transition hover:border-teal-500/40 hover:bg-teal-50/30"
                >
                  <span>
                    <span className="block text-[12.5px] font-bold text-navy-900">{popular.name}</span>
                    <span className="block text-[10px] text-ink-400">{popular.state}</span>
                  </span>
                  <ArrowRight size={13} className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Sources ───────────────────────────────────────────────── */}
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[1.05rem]">Where this data comes from</h3>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-ink-500">
                Samaj Darpan retrieves public records through documented APIs where
                available and administrator imports otherwise. It does not scrape
                restricted portals or fabricate missing values.
              </p>
            </div>
            <Link to="/sources" className="btn btn-outline btn-sm">
              <Database size={13} /> Source status
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "OGD India", href: "https://data.gov.in/", note: "Dataset API" },
              { name: "PAIMANA", href: "https://ipm.mospi.gov.in/Home/PublicDashboard", note: "Public dashboard" },
              { name: "Smart Cities", href: "https://smartcities.data.gov.in/", note: "Mission data" },
              { name: "GeoSadak", href: "https://geosadak-pmgsy.nic.in/", note: "Rural roads" },
            ].map((source) => (
              <a
                key={source.name}
                href={source.href}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-lg border border-navy-900/8 bg-cream-50 px-3 py-2.5 transition hover:border-teal-500/30"
              >
                <span className="block text-[11.5px] font-bold text-navy-900">{source.name}</span>
                <span className="block text-[9.5px] text-ink-400">{source.note} ↗</span>
              </a>
            ))}
          </div>
          <SourceLine
            className="mt-4"
            organisation="Samaj Darpan demonstration dataset + sourced public records"
            url={null}
          />
        </section>
      </div>
    </div>
  );
}

function HeroStat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-cream-50/40">
        {label}
      </dt>
      <dd className="mt-1 font-display text-[1.55rem] leading-none text-cream-50">{value}</dd>
      <dd className="mt-1 text-[9.5px] text-cream-50/40">{note}</dd>
    </div>
  );
}

function CoverageBar({
  label,
  value,
  emptyLabel = "Not available",
}: {
  label: string;
  value: number | null;
  emptyLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold text-ink-600">{label}</p>
        <p className={cn("text-[10.5px] font-bold", value === null ? "text-ink-400" : "text-navy-900")}>
          {value === null ? emptyLabel : formatPercent(value)}
        </p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
        <div
          className={cn("h-full rounded-full", value !== null && value > 50 ? "bg-teal-500" : "bg-gold-500")}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}
