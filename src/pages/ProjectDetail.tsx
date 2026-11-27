import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  Database,
  FileText,
  Gavel,
  HardHat,
  Landmark,
  Layers,
  Link2,
  MapPin,
  MessageSquarePlus,
  Ruler,
  ShieldCheck,
  ShieldQuestion,
  Users,
  Wallet,
} from "lucide-react";
import type {
  BoundaryMatch,
  Complaint,
  ComplaintStatus,
  Project,
  Representative,
  RepresentativeLink,
} from "@shared/types";
import {
  CATEGORY_LABELS,
  DATA_CLASS_DESCRIPTIONS,
  STATUS_LABELS,
  UNAVAILABLE,
  formatDate,
  formatINR,
  formatINRCompact,
  formatPercent,
  relativeDate,
} from "@shared/format";
import {
  AccuracyNote,
  Badge,
  Button,
  DataClassBadge,
  ErrorState,
  LoadingBlock,
  SourceLine,
  StatusBadge,
  Tabs,
  Unavailable,
  VerificationBadge,
  cn,
} from "@/components/ui";
import { CategoryIcon } from "@/components/ProjectCard";
import { ProjectMap } from "@/components/maps";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { ApiError, apiFetch } from "@/services/api";

interface DetailResponse {
  project: Project;
  areaRepresentatives: Representative[];
  verifiedRepresentatives: (RepresentativeLink & { representative: Representative })[];
  boundaryMatches: BoundaryMatch[];
  complaints: Complaint[];
  source: { organisation: string; url: string | null; retrievedAt: string };
}

const COMPLAINT_CATEGORIES = [
  ["quality", "Construction quality"],
  ["delay", "Delay in delivery"],
  ["safety", "Public safety"],
  ["cost", "Cost or transparency"],
  ["accessibility", "Accessibility"],
  ["corruption", "Irregularity concern"],
  ["other", "Other"],
] as const;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";
  const { data, loading, error, refresh } = useApiData<DetailResponse>(
    id ? `/projects/${id}` : null,
    [id],
  );
  const toast = useToast();
  const { user } = useAuth();
  const { isFollowed, toggle: toggleFollow } = useWatchlist();
  const geoData = useApiData<GeoJSON.GeoJsonObject>("/geo/constituencies");

  const setTab = (next: string) => {
    const updated = new URLSearchParams(searchParams);
    updated.set("tab", next);
    setSearchParams(updated, { replace: true });
  };

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton mt-4 h-14 w-3/4" />
        <div className="skeleton mt-3 h-4 w-1/2" />
        <div className="skeleton mt-6 h-[300px] w-full rounded-2xl" />
        <LoadingBlock className="mt-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-page py-16">
        <ErrorState
          message={error ?? "This project record could not be found."}
          onRetry={refresh}
        />
        <div className="mt-4 text-center">
          <Link to="/projects" className="btn btn-outline btn-sm">Back to projects</Link>
        </div>
      </div>
    );
  }

  const { project, areaRepresentatives, verifiedRepresentatives, boundaryMatches = [], complaints } = data;
  const followed = isFollowed(project.id);
  const isDemo = project.dataClass === "demonstration";
  const cityLink = project.citySlug
    ? `/cities/${project.stateSlug}/${project.citySlug}`
    : "/projects";
  const remaining =
    project.expenditure !== null && (project.revisedBudget ?? project.approvedBudget) !== null
      ? (project.revisedBudget ?? project.approvedBudget)! - project.expenditure
      : null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.push("Record link copied", { tone: "success" });
    } catch {
      toast.push("Could not copy the link", { tone: "error" });
    }
  };

  return (
    <div>
      <div className="border-b hairline bg-cream-50">
        <div className="container-page py-7">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
            <Link to="/" className="hover:text-teal-700">India</Link>
            <span>/</span>
            <Link to={cityLink} className="hover:text-teal-700">
              {project.city ?? project.state}
            </Link>
            <span>/</span>
            <Link to="/projects" className="hover:text-teal-700">Projects</Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="badge border border-navy-900/10 bg-white text-ink-700">
              <CategoryIcon category={project.category} size={11} />
              {CATEGORY_LABELS[project.category]}
            </span>
            <StatusBadge status={project.status} />
            <DataClassBadge dataClass={project.dataClass} />
            <VerificationBadge status={project.verificationStatus} />
            {project.coordinatesVerified ? (
              <Badge tone="teal">
                <MapPin size={10} /> Location from source
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="text-[1.9rem] leading-[1.1] sm:text-[2.45rem]">
                {project.name}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-500">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {[project.city, project.district, project.state].filter(Boolean).join(", ") || "Location not published"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[10.5px] text-ink-400">ID {project.id}</span>
                <span aria-hidden="true">·</span>
                <span>Updated {formatDate(project.lastUpdated)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={followed ? "teal" : "outline"}
                size="sm"
                onClick={() => toggleFollow(project.id)}
                icon={followed ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
              >
                {followed ? "Saved" : "Save project"}
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink} icon={<Copy size={13} />}>
                Copy link
              </Button>
              {project.sourceUrl ? (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-outline btn-sm"
                >
                  Source record <ArrowUpRight size={13} />
                </a>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setTab("complaints")}
                icon={<MessageSquarePlus size={13} />}
              >
                Report an issue
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        {isDemo ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold-500/40 bg-gold-100/60 px-4 py-3 text-[12px] text-[#6b5412]">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">This is a demonstration record, not a real project.</p>
              <p className="mt-0.5 leading-relaxed">
                It exists only to preview the interface. No financial, contractor, progress
                or location claim on this page is factual. Complaints are disabled on
                demonstration records.
              </p>
            </div>
          </div>
        ) : null}

        {/* Media */}
        {project.lat !== null && project.lng !== null && project.coordinatesVerified ? (
          <div>
            <ProjectMap
              project={project}
              height={370}
              constituenciesGeoJson={geoData.data}
            />
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-400">
              <MapPin size={10} />
              Coordinate published by the cited source. Map: OpenStreetMap.
            </p>
          </div>
        ) : isDemo ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-gold-500/30 bg-gold-100/30 p-8 text-center">
            <Layers size={26} className="text-gold-600" />
            <p className="mt-2 font-display text-lg text-navy-900">No location is published</p>
            <p className="mt-1 max-w-md text-[11.5px] text-ink-500">
              Demonstration records do not carry surveyed coordinates. The platform does
              not plot approximate locations as if they were real project sites.
            </p>
          </div>
        ) : project.lat !== null && project.lng !== null ? (
          <div className="relative overflow-hidden rounded-xl border border-amber-300/60 bg-amber-50/70">
            <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center">
              <Badge tone="gold" className="w-fit">Coordinate not verified</Badge>
              <p className="mt-3 font-display text-lg text-navy-900">
                A coordinate was supplied, but not confirmed
              </p>
              <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-ink-500">
                The imported record includes a latitude and longitude, but an
                administrator has not checked it against the cited source. Samaj Darpan
                does not plot an unverified point as if it were a surveyed project site.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-navy-950">
            <img
              src="/images/atal-setu.jpg"
              alt="Representative Indian public infrastructure — not a photograph of this project"
              className="h-[240px] w-full object-cover opacity-40 sm:h-[300px]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-9">
              <Badge tone="gold" className="w-fit">Representative image</Badge>
              <p className="mt-3 max-w-md font-display text-xl text-cream-50 sm:text-2xl">
                No surveyed project coordinate is published in the source record.
              </p>
              <p className="mt-2 max-w-md text-[11px] leading-relaxed text-cream-50/55">
                Samaj Darpan does not place a marker at a guessed location. An
                administrator can add a verified coordinate when a public source
                publishes one.
              </p>
              <p className="mt-4 text-[9px] text-cream-50/30">
                Photograph: Atal Setu, Mumbai — Wikimedia Commons, CC0. Not this project.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "overview", label: "Overview", icon: <Layers size={13} /> },
              { id: "financials", label: "Financial details", icon: <Banknote size={13} /> },
              { id: "progress", label: "Construction progress", icon: <Ruler size={13} /> },
              { id: "contractor", label: "Contractor", icon: <HardHat size={13} /> },
              { id: "accountability", label: "Political accountability", icon: <Users size={13} /> },
              { id: "documents", label: "Documents & sources", count: project.documents.length, icon: <FileText size={13} /> },
              { id: "complaints", label: "Citizen complaints", count: complaints.length, icon: <ClipboardList size={13} /> },
            ]}
          />
        </div>

        <div className="mt-6">
          {tab === "overview" ? (
            <OverviewTab project={project} setTab={setTab} />
          ) : tab === "financials" ? (
            <FinancialsTab project={project} remaining={remaining} setTab={setTab} />
          ) : tab === "progress" ? (
            <ProgressTab project={project} />
          ) : tab === "contractor" ? (
            <ContractorTab project={project} />
          ) : tab === "accountability" ? (
            <AccountabilityTab
              project={project}
              areaRepresentatives={areaRepresentatives}
              verifiedRepresentatives={verifiedRepresentatives}
              boundaryMatches={boundaryMatches}
            />
          ) : tab === "documents" ? (
            <DocumentsTab project={project} />
          ) : tab === "complaints" ? (
            <ComplaintsTab
              project={project}
              complaints={complaints}
              onChanged={refresh}
            />
          ) : null}
        </div>

        {user?.role === "admin" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-900/10 bg-white px-4 py-3">
            <p className="text-[11px] text-ink-500">
              Administrator: verify, correct or annotate this record in the admin console.
            </p>
            <Link to={`/admin/projects?q=${encodeURIComponent(project.id)}`} className="btn btn-outline btn-sm">
              Open in admin
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Overview ─────────────────────────────────────────────────────────── */

function OverviewTab({ project, setTab }: { project: Project; setTab: (tab: string) => void }) {
  const missing = [
    project.approvedBudget === null && "Approved cost",
    project.expenditure === null && "Documented expenditure",
    project.startDate === null && "Start date",
    project.expectedCompletion === null && "Expected completion",
    project.physicalProgress === null && "Physical progress",
    project.contractor === null && "Contractor",
    project.lat === null && "Project coordinates",
    project.executingDepartment === null && "Executing department",
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="font-display text-xl">About this project</h2>
          {project.description ? (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-700">{project.description}</p>
          ) : (
            <p className="mt-3"><Unavailable /></p>
          )}

          <div className="mt-5 grid gap-x-6 gap-y-4 border-t hairline pt-4 sm:grid-cols-2">
            <Fact label="Category" value={CATEGORY_LABELS[project.category]} />
            <Fact label="Current status" value={STATUS_LABELS[project.status]} />
            <Fact label="Executing department" value={project.executingDepartment} />
            <Fact label="Funding authority" value={project.fundingAuthority} />
            <Fact label="Implementing agency" value={project.implementingAgency} />
            <Fact label="District" value={project.district} />
            <Fact label="Start date" value={project.startDate ? formatDate(project.startDate) : null} />
            <Fact
              label="Expected completion"
              value={project.expectedCompletion ? formatDate(project.expectedCompletion) : null}
            />
            <Fact
              label="Actual completion"
              value={project.actualCompletion ? formatDate(project.actualCompletion) : null}
            />
            <Fact label="Contractor" value={project.contractor} />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Link to={`?tab=financials`} onClick={(e) => { e.preventDefault(); setTab("financials"); }} className="card p-4 transition hover:border-teal-500/35">
            <Wallet size={16} className="text-teal-600" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">Approved cost</p>
            <p className="mt-0.5 text-[15px] font-bold text-navy-900">
              {project.approvedBudget === null ? "Not published" : formatINRCompact(project.approvedBudget)}
            </p>
          </Link>
          <Link to="?tab=progress" onClick={(e) => { e.preventDefault(); setTab("progress"); }} className="card p-4 transition hover:border-teal-500/35">
            <Ruler size={16} className="text-teal-600" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">Physical progress</p>
            <p className="mt-0.5 text-[15px] font-bold text-navy-900">
              {project.physicalProgress === null ? "Not published" : formatPercent(project.physicalProgress)}
            </p>
          </Link>
          <Link to="?tab=accountability" onClick={(e) => { e.preventDefault(); setTab("accountability"); }} className="card p-4 transition hover:border-teal-500/35">
            <Users size={16} className="text-teal-600" />
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">Responsibility</p>
            <p className="mt-0.5 text-[15px] font-bold text-navy-900">
              {project.executingDepartment ? "Department named" : "Not confirmed"}
            </p>
          </Link>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl">What the public record does not show</h2>
            <Badge tone={missing.length ? "amber" : "green"}>
              {missing.length ? `${missing.length} gaps` : "Complete fields"}
            </Badge>
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
            These fields are absent from the cited source. They are not estimated,
            interpolated or borrowed from another project.
          </p>
          {missing.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {missing.map((field) => (
                <span key={field} className="badge border border-amber-500/25 bg-amber-50 text-[#8a5a00]">
                  {field}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-teal-700">
              <CheckCircle2 size={14} /> All core fields in this template have a published value.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h3 className="font-display text-lg">Record provenance</h3>
          <div className="mt-3 space-y-2.5 text-[11.5px]">
            <Row label="Classification">
              <DataClassBadge dataClass={project.dataClass} short={false} />
            </Row>
            <Row label="Verification">
              <VerificationBadge status={project.verificationStatus} />
            </Row>
            <Row label="Source">
              <span className="text-right font-semibold text-ink-700">{project.sourceOrganisation}</span>
            </Row>
            <Row label="Source ID">
              <span className="font-mono text-[10px] text-ink-500">{project.sourceId ?? "Not assigned"}</span>
            </Row>
            <Row label="Retrieved">
              <span className="text-ink-600">{formatDate(project.retrievedAt)}</span>
            </Row>
            <Row label="Last verified">
              <span className="text-ink-600">{project.lastVerifiedAt ? formatDate(project.lastVerifiedAt) : "Not yet verified"}</span>
            </Row>
          </div>
          <p className="mt-3 rounded-lg bg-cream-50 p-2.5 text-[10px] leading-relaxed text-ink-500">
            {DATA_CLASS_DESCRIPTIONS[project.dataClass]}
          </p>
          {project.sourceUrl ? (
            <a href={project.sourceUrl} target="_blank" rel="noreferrer noopener" className="btn btn-outline btn-sm mt-3 w-full">
              <Link2 size={13} /> Open cited source
            </a>
          ) : null}
        </section>

        {project.caveats.length > 0 ? (
          <section className="card p-5">
            <h3 className="font-display text-lg">Important caveats</h3>
            <ul className="mt-2 space-y-2">
              {project.caveats.map((caveat, index) => (
                <li key={index} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-500">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  {caveat}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="card p-5">
          <h3 className="font-display text-lg">How to use this record</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Follow the cited source before relying on a figure. If a field is missing,
            treat it as missing — not as zero. You can report a problem or request a
            correction from your account.
          </p>
          <Link to="/methodology" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700">
            Read data methodology <ArrowUpRight size={11} />
          </Link>
        </section>
      </aside>
    </div>
  );
}

/* ── Financials ───────────────────────────────────────────────────────── */

function FinancialsTab({
  project,
  remaining,
  setTab,
}: {
  project: Project;
  remaining: number | null;
  setTab: (tab: string) => void;
}) {
  const approved = project.revisedBudget ?? project.approvedBudget;
  const funding = project.funding;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="font-display text-xl">Documented financials</h2>
          <p className="mt-1 text-[11px] text-ink-400">
            All amounts in Indian rupees, transcribed from the cited record. No estimate
            is substituted for an unpublished figure.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MoneyBox label="Original approved cost" value={project.approvedBudget} />
            <MoneyBox label="Revised cost" value={project.revisedBudget} />
            <MoneyBox label="Documented expenditure" value={project.expenditure} />
            <MoneyBox
              label="Remaining balance"
              value={remaining}
              note={
                remaining === null
                  ? undefined
                  : "Calculated as approved/revised cost minus published expenditure. Not an audited balance."
              }
            />
          </div>
          <AccuracyNote tone="info">
            A remaining balance is shown only when both components are published on a
            compatible basis. It is an arithmetic difference, not a statement about
            unspent public money.
          </AccuracyNote>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Funding sources</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-navy-900/10">
            <table className="w-full text-left text-[11.5px]">
              <thead className="bg-cream-50 text-[9.5px] uppercase tracking-[0.1em] text-ink-400">
                <tr>
                  <th className="px-3 py-2 font-bold">Source</th>
                  <th className="px-3 py-2 text-right font-bold">Published contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                <FundingRow label="Central government" value={funding.central} />
                <FundingRow label="State government" value={funding.state} />
                <FundingRow label="Municipal contribution" value={funding.municipal} />
                <FundingRow label={funding.otherSourceLabel ?? "Other documented sources"} value={funding.other} />
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            {funding.notes ? (
              <p className="text-[11px] leading-relaxed text-ink-500">{funding.notes}</p>
            ) : (
              <Unavailable />
            )}
          </div>
          {funding.sourceUrl ? (
            <SourceLine organisation={project.sourceOrganisation} url={funding.sourceUrl} className="mt-3" />
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Financial progress</h2>
          {project.financialProgress === null ? (
            <p className="mt-2"><Unavailable /></p>
          ) : (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-ink-500">Published financial progress</span>
                <span className="text-navy-900">{formatPercent(project.financialProgress)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-navy-800" style={{ width: `${project.financialProgress}%` }} />
              </div>
            </div>
          )}
          {approved !== null && project.expenditure !== null && approved > 0 ? (
            <p className="mt-3 text-[11.5px] text-ink-500">
              Published expenditure equals{" "}
              <strong className="text-navy-900">
                {formatPercent(Math.round((project.expenditure / approved) * 1000) / 10)}
              </strong>{" "}
              of the documented project cost. This is a derived ratio, clearly labelled as
              such.
            </p>
          ) : null}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h3 className="font-display text-lg">Financial transparency checklist</h3>
          <ul className="mt-3 space-y-2 text-[11px]">
            <CheckItem ok={project.approvedBudget !== null} label="Approved cost published" />
            <CheckItem ok={project.revisedBudget !== null} label="Revised cost published" />
            <CheckItem ok={project.expenditure !== null} label="Expenditure published" />
            <CheckItem ok={Boolean(funding.central || funding.state || funding.municipal)} label="Funding split published" />
            <CheckItem ok={Boolean(project.financialProgress !== null)} label="Financial progress published" />
          </ul>
        </section>
        <section className="card p-5">
          <h3 className="font-display text-lg">Where to verify</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Sanction letters, detailed project reports and audited accounts are usually
            published by the executing department. Where available, they are linked in
            Documents & sources.
          </p>
          <button
            type="button"
            onClick={() => setTab("documents")}
            className="mt-3 text-[11px] font-bold text-teal-700"
          >
            View documents & sources →
          </button>
        </section>
      </aside>
    </div>
  );
}

/* ── Progress ─────────────────────────────────────────────────────────── */

function ProgressTab({ project }: { project: Project }) {
  const events = [
    { date: project.startDate, label: "Project start", detail: "As published by the source" },
    { date: project.expectedCompletion, label: "Expected completion", detail: "Target recorded by the source" },
    { date: project.actualCompletion, label: "Actual completion", detail: "Recorded completion date" },
  ].filter((event) => event.date);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-5">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Construction progress</h2>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProgressBar label="Physical progress" value={project.physicalProgress} color="teal" />
            <ProgressBar label="Financial progress" value={project.financialProgress} color="navy" />
          </div>
          {project.status === "delayed" || project.status === "stalled" ? (
            <div className="mt-4">
              <AccuracyNote tone="warning">
                The cited source records this project as{" "}
                <strong>{STATUS_LABELS[project.status].toLowerCase()}</strong>. A documented
                reason for the delay is not necessarily published and has not been inferred.
              </AccuracyNote>
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Recorded timeline</h2>
          {events.length === 0 ? (
            <p className="mt-2"><Unavailable /> No start, target or completion date is published for this record.</p>
          ) : (
            <ol className="mt-4 space-y-0">
              {events.map((event, index) => (
                <li key={event.label} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < events.length - 1 ? (
                    <span className="absolute left-[7px] top-4 h-full w-px bg-cream-300" />
                  ) : null}
                  <span className="relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-teal-500 bg-white" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                      {formatDate(event.date)}
                    </p>
                    <p className="text-[12.5px] font-bold text-navy-900">{event.label}</p>
                    <p className="text-[10.5px] text-ink-500">{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Update history</h2>
          <div className="mt-3 space-y-2">
            <HistoryRow date={project.lastUpdated} title="Record last updated" detail="Source refresh or administrator edit" />
            <HistoryRow date={project.retrievedAt} title="Retrieved from source" detail={project.sourceOrganisation} />
            {project.lastVerifiedAt ? (
              <HistoryRow date={project.lastVerifiedAt} title="Administrator verification" detail="Record checked against the cited source" />
            ) : null}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h3 className="font-display text-lg">Progress photographs</h3>
          {(() => {
            const photos = project.documents.filter((d) => d.kind === "photograph");
            if (photos.length === 0) {
              return (
                <div className="mt-3 rounded-lg border border-dashed border-navy-900/15 px-4 py-8 text-center">
                  <Ruler size={20} className="mx-auto text-ink-300" />
                  <p className="mt-2 text-[11px] font-semibold text-ink-500">
                    No verified progress photograph
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                    Samaj Darpan does not use stock or unrelated imagery as project evidence.
                    Only source-published photographs would appear here.
                  </p>
                </div>
              );
            }
            return (
              <ul className="mt-3 space-y-3">
                {photos.map((photo) => (
                  <li key={photo.id} className="overflow-hidden rounded-lg border border-navy-900/10 bg-cream-50">
                    <a href={photo.url} target="_blank" rel="noreferrer noopener" className="block p-3 hover:bg-cream-100">
                      <p className="text-[11.5px] font-bold text-navy-900">{photo.title}</p>
                      <p className="mt-0.5 text-[9.5px] text-ink-400">
                        {photo.sourceOrganisation ?? project.sourceOrganisation}
                        {photo.publishedAt ? ` · ${formatDate(photo.publishedAt)}` : ""} ↗
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            );
          })()}
        </section>
        <section className="card p-5">
          <h3 className="font-display text-lg">Completion dates</h3>
          <dl className="mt-3 space-y-2 text-[11px]">
            <Row label="Start"><span>{project.startDate ? formatDate(project.startDate) : UNAVAILABLE}</span></Row>
            <Row label="Expected"><span>{project.expectedCompletion ? formatDate(project.expectedCompletion) : UNAVAILABLE}</span></Row>
            <Row label="Actual"><span>{project.actualCompletion ? formatDate(project.actualCompletion) : UNAVAILABLE}</span></Row>
          </dl>
        </section>
      </aside>
    </div>
  );
}

/* ── Contractor ───────────────────────────────────────────────────────── */

function ContractorTab({ project }: { project: Project }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-5">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream-100 text-ink-600">
              <HardHat size={19} />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Contractor named at source
              </p>
              <h2 className="font-display text-xl">
                {project.contractor ?? "Contractor information not publicly available"}
              </h2>
            </div>
          </div>
          {project.contractor ? (
            <>
              <p className="mt-4 text-[12px] leading-relaxed text-ink-600">
                This name appears in the cited public record. Samaj Darpan has not
                independently audited the appointment, contract value or performance.
              </p>
              <SourceLine
                organisation={project.sourceOrganisation}
                url={project.sourceUrl}
                retrievedAt={project.retrievedAt}
                className="mt-3"
              />
            </>
          ) : (
            <div className="mt-4">
              <AccuracyNote tone="info">
                The cited record does not name a contractor. Contractor appointments are
                sometimes published only in tender award documents; absence here is not
                evidence that no contractor exists.
              </AccuracyNote>
              <Link to="/contractors" className="btn btn-outline btn-sm mt-3">
                Browse sourced contractor records
              </Link>
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Responsibility chain</h2>
          <div className="mt-3">
            <Chain project={project} />
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h3 className="font-display text-lg">Contractor verification</h3>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Administrator-verified contractor records are displayed with a verification
            state. This project record is currently:
          </p>
          <div className="mt-2"><VerificationBadge status={project.verificationStatus} /></div>
          <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
            To correct a contractor name, an administrator must provide a public source.
            Names are never inferred from another project.
          </p>
        </section>
      </aside>
    </div>
  );
}

/* ── Accountability ───────────────────────────────────────────────────── */

function AccountabilityTab({
  project,
  areaRepresentatives,
  verifiedRepresentatives,
  boundaryMatches,
}: {
  project: Project;
  areaRepresentatives: Representative[];
  verifiedRepresentatives: (RepresentativeLink & { representative: Representative })[];
  boundaryMatches: BoundaryMatch[];
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-amber-500/30 bg-amber-50/70 p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-[12px] font-bold text-[#6b5412]">
              Geographic representation is not the same as project responsibility.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7a621e]">
              An MP or MLA represents an area; that does not mean they sanctioned,
              funded or executed this project. Only a verified constituency mapping or an
              administrator-verified link is presented as project-specific.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-xl">Who is responsible for this project?</h2>
          <p className="mt-1 text-[11px] text-ink-400">
            The documented chain of authority, as published.
          </p>
          <div className="mt-4 rounded-xl bg-navy-950 p-5 text-cream-50">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-400">
              Public infrastructure project
            </p>
            <p className="mt-1 font-display text-lg leading-tight text-cream-50">
              {project.name}
            </p>
            <div className="my-4 h-px bg-white/15" />
            <div className="space-y-0">
              <ChainNode label="Funding authority" value={project.fundingAuthority} />
              <ChainNode label="Executing department" value={project.executingDepartment} />
              <ChainNode label="Implementing agency" value={project.implementingAgency} />
              <ChainNode label="Contractor" value={project.contractor} />
              <ChainNode
                label="Area representatives"
                value={
                  areaRepresentatives.length
                    ? `${areaRepresentatives.length} recorded (not project-specific)`
                    : null
                }
                last
              />
            </div>
          </div>
          <div className="mt-3">
            <SourceLine
              organisation={project.sourceOrganisation}
              url={project.sourceUrl}
              retrievedAt={project.retrievedAt}
            />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Project funding</h2>
          <div className="mt-3 space-y-2.5">
            <FundingLine label="Central government" value={project.funding.central} />
            <FundingLine label="State government" value={project.funding.state} />
            <FundingLine label="Municipal contribution" value={project.funding.municipal} />
            <FundingLine label={project.funding.otherSourceLabel ?? "Other sources"} value={project.funding.other} />
          </div>
          {project.funding.notes ? (
            <p className="mt-3 border-t hairline pt-3 text-[10.5px] leading-relaxed text-ink-500">
              {project.funding.notes}
            </p>
          ) : null}
          {project.funding.sourceUrl ? (
            <a href={project.funding.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
              Funding source <ArrowUpRight size={10} />
            </a>
          ) : null}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Elected representatives for this area</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-ink-500">
              These officials represent the city or region in which the project is
              located. They are listed for civic context, not attributed as project
              sponsors.
            </p>
          </div>
          <Badge tone="amber"><ShieldQuestion size={11} /> Not project-verified</Badge>
        </div>

        {areaRepresentatives.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areaRepresentatives.map((representative) => (
              <RepresentativeCard key={representative.id} representative={representative} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-navy-900/15 p-6 text-center">
            <Users size={20} className="mx-auto text-ink-300" />
            <p className="mt-2 text-[12px] font-semibold text-ink-500">
              Representative information unavailable
            </p>
            <p className="mt-1 text-[10.5px] text-ink-400">
              No sourced representative record is currently mapped to this location.
            </p>
          </div>
        )}
      </section>

      {boundaryMatches.length > 0 ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl">Point-in-polygon constituency match</h2>
              <p className="mt-1 text-[11px] text-ink-500">
                Matched from the project's coordinates against uploaded GeoJSON constituency
                boundaries. Geographic containment identifies the constituency area, not
                executive project sponsorship.
              </p>
            </div>
            <Badge tone="teal">
              <MapPin size={10} /> {boundaryMatches.length} boundary match{boundaryMatches.length === 1 ? "" : "es"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {boundaryMatches.map((match) => (
              <div
                key={`${match.name}-${match.house ?? ""}`}
                className="rounded-lg border border-teal-500/25 bg-teal-50/40 p-3"
              >
                <p className="text-[12px] font-bold text-navy-900">{match.name}</p>
                <p className="text-[10px] text-ink-500">
                  {match.house ? match.house.replace("-", " ") : "Constituency"}
                  {match.state ? ` · ${match.state}` : ""}
                </p>
                {match.matchedRepresentativeName ? (
                  <p className="mt-1.5 text-[11px] font-semibold text-teal-800">
                    Recorded representative: {match.matchedRepresentativeName}
                    {match.party ? ` (${match.party})` : ""}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[10px] italic text-ink-400">
                    No matching representative record in directory.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {verifiedRepresentatives.length > 0 ? (
        <section className="card p-5">
          <h2 className="font-display text-xl">Verified project attribution</h2>
          <p className="mt-1 text-[11px] text-ink-500">
            These links were manually verified by an administrator or matched against a
            constituency boundary dataset.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {verifiedRepresentatives.map((link) => (
              <div key={link.representativeId}>
                <RepresentativeCard representative={link.representative} compact />
                <p className="mt-1.5 text-[10px] text-ink-400">
                  Basis: {link.basis.replace("-", " ")} · Verified{" "}
                  {link.verifiedAt ? formatDate(link.verifiedAt) : "date not recorded"}
                  {link.note ? ` · ${link.note}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-navy-900/10 bg-white p-4">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
            <ShieldQuestion size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <span>
              <strong className="text-navy-900">Constituency not verified.</strong> This
              project has no verified point-in-polygon constituency match or
              administrator-confirmed representative link. No political party or
              officeholder has been inferred from the project's city.
            </span>
          </p>
        </section>
      )}

      <section className="card p-5">
        <h2 className="font-display text-xl">Administrative responsibility</h2>
        <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Sanctioning authority" value={project.responsibility.sanctioningAuthority} />
          <Fact label="Tendering authority" value={project.responsibility.tenderingAuthority} />
          <Fact label="Supervising department" value={project.responsibility.supervisingDepartment} />
          <Fact label="Executing agency" value={project.responsibility.executingAgency} />
          <Fact label="Contractor" value={project.responsibility.contractor} />
          <Fact label="Central ministry" value={project.responsibility.supervisingDepartment} />
        </div>
        <p className="mt-4 border-t hairline pt-3 text-[10px] leading-relaxed text-ink-400">
          Every attribution should carry a source and verification date. Where a field is
          blank, the platform has not found a public source that confirms it.
        </p>
      </section>
    </div>
  );
}

/* ── Documents ────────────────────────────────────────────────────────── */

function DocumentsTab({ project }: { project: Project }) {
  const kindLabel: Record<string, string> = {
    tender: "Tender record",
    dpr: "Detailed project report",
    report: "Public report",
    photograph: "Photograph",
    notification: "Government notification",
    other: "Document",
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-4">
        <section className="card p-5">
          <h2 className="font-display text-xl">Documents & public records</h2>
          {project.documents.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-navy-900/15 p-6 text-center">
              <FileText size={20} className="mx-auto text-ink-300" />
              <p className="mt-2 text-[12px] font-semibold text-ink-500">No documents attached</p>
              <p className="mt-1 text-[10.5px] text-ink-400">
                No official document, tender record or report is linked to this record yet.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-navy-900/8">
              {project.documents.map((document) => (
                <li key={document.id} className="flex items-start gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-ink-500">
                    <FileText size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-navy-900">{document.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {kindLabel[document.kind] ?? document.kind}
                      {document.sourceOrganisation ? ` · ${document.sourceOrganisation}` : ""}
                      {document.publishedAt ? ` · ${formatDate(document.publishedAt)}` : ""}
                    </p>
                  </div>
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="btn btn-outline btn-sm shrink-0"
                  >
                    Open <ArrowUpRight size={11} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl">Source attribution</h2>
          <div className="mt-3 rounded-lg border border-navy-900/10 bg-cream-50 p-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
              Primary source
            </p>
            <p className="mt-1 text-[12.5px] font-bold text-navy-900">{project.sourceOrganisation}</p>
            {project.sourceUrl ? (
              <a href={project.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-1 inline-flex items-center gap-1 break-all text-[10.5px] font-semibold text-teal-700">
                {project.sourceUrl} <ArrowUpRight size={10} className="shrink-0" />
              </a>
            ) : (
              <p className="mt-1 text-[10.5px] italic text-ink-400">No URL is published for this record.</p>
            )}
            <dl className="mt-3 grid gap-2 border-t hairline pt-3 text-[10.5px] sm:grid-cols-3">
              <div>
                <dt className="text-ink-400">Retrieved</dt>
                <dd className="font-semibold text-ink-700">{formatDate(project.retrievedAt)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Last updated</dt>
                <dd className="font-semibold text-ink-700">{formatDate(project.lastUpdated)}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Last verified</dt>
                <dd className="font-semibold text-ink-700">
                  {project.lastVerifiedAt ? formatDate(project.lastVerifiedAt) : "Not verified"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h3 className="font-display text-lg">Verification state</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DataClassBadge dataClass={project.dataClass} short={false} />
            <VerificationBadge status={project.verificationStatus} />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-ink-500">
            {DATA_CLASS_DESCRIPTIONS[project.dataClass]}
          </p>
          <Link to="/methodology" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
            Verification workflow <ArrowUpRight size={10} />
          </Link>
        </section>
        <section className="card p-5">
          <h3 className="font-display text-lg">Caveats</h3>
          {project.caveats.length ? (
            <ul className="mt-2 space-y-2">
              {project.caveats.map((caveat, index) => (
                <li key={index} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-ink-500">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                  {caveat}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10.5px] text-ink-400">No additional caveats recorded.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

/* ── Complaints ───────────────────────────────────────────────────────── */

function ComplaintsTab({
  project,
  complaints,
  onChanged,
}: {
  project: Project;
  complaints: Complaint[];
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("quality");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemo = project.dataClass === "demonstration";
  const canReview = user?.role === "admin" || user?.role === "official";
  const publicCount = complaints.filter((c) => c.isPublic).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (title.trim().length < 6) {
      setError("Give your report a title of at least 6 characters.");
      return;
    }
    if (description.trim().length < 30) {
      setError("Describe the issue in at least 30 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/complaints", {
        method: "POST",
        body: JSON.stringify({
          projectId: project.id,
          category,
          title: title.trim(),
          description: description.trim(),
          isPublic,
        }),
      });
      toast.push("Complaint submitted", {
        description: "It will be reviewed by an official or administrator.",
        tone: "success",
      });
      setTitle("");
      setDescription("");
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit the complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusTone = {
    open: "amber",
    "in-review": "teal",
    resolved: "green",
    rejected: "red",
  } as const;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <div className="space-y-4">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Citizen complaints on this project</h2>
            <div className="flex items-center gap-1.5">
              <Badge tone="neutral">{publicCount} public</Badge>
              {complaints.length > publicCount ? (
                <Badge tone="amber">{complaints.length - publicCount} private visible to you</Badge>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            Complaints are citizen reports, not verified government findings. Resolution
            updates are recorded with the responding account.
          </p>

          {complaints.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-navy-900/15 px-5 py-8 text-center">
              <ClipboardList size={20} className="mx-auto text-ink-300" />
              <p className="mt-2 text-[12px] font-semibold text-ink-500">No public complaints yet</p>
              <p className="mt-1 text-[10.5px] text-ink-400">
                If you have observed a problem, file a report. It becomes part of the
                public accountability record.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-navy-900/8">
              {complaints.map((complaint) => (
                <li key={complaint.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-navy-900">{complaint.title}</p>
                    <div className="flex items-center gap-1.5">
                      {!complaint.isPublic ? <Badge tone="amber">Non-public</Badge> : null}
                      <Badge tone={statusTone[complaint.status]}>{complaint.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{complaint.description}</p>
                  <p className="mt-1.5 text-[9.5px] text-ink-400">
                    {complaint.authorName} · {formatDate(complaint.createdAt)} · {complaint.category}
                  </p>
                  {complaint.resolutionNote ? (
                    <div className="mt-2 rounded-md bg-teal-50 px-2.5 py-2 text-[10.5px] text-teal-800">
                      <strong>Official response:</strong> {complaint.resolutionNote}
                    </div>
                  ) : null}
                  {canReview ? (
                    <InlineComplaintReview complaint={complaint} onUpdated={onChanged} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        {isDemo ? (
          <section className="card p-5">
            <h3 className="font-display text-lg">Complaints disabled</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              This is a demonstration record. Filing a complaint against a non-existent
              project would create misleading data, so the action is disabled here.
            </p>
          </section>
        ) : user ? (
          <section className="card p-5">
            <h3 className="font-display text-lg">Report a problem</h3>
            <p className="mt-1 text-[11px] text-ink-400">
              Your name and report will be public. Do not include personal data about
              third parties.
            </p>
            {!open ? (
              <Button className="mt-3 w-full" onClick={() => setOpen(true)} icon={<MessageSquarePlus size={14} />}>
                Start a report
              </Button>
            ) : (
              <form onSubmit={submit} className="mt-3 space-y-3">
                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-[10.5px] text-red-800">
                    {error}
                  </p>
                ) : null}
                <div>
                  <label htmlFor="complaint-category" className="field-label">Category</label>
                  <select id="complaint-category" className="input !py-2 !text-[12px]" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {COMPLAINT_CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="complaint-title" className="field-label">Title</label>
                  <input id="complaint-title" className="input !py-2 !text-[12px]" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Short summary" />
                </div>
                <div>
                  <label htmlFor="complaint-description" className="field-label">What did you observe?</label>
                  <textarea id="complaint-description" className="input min-h-[100px] !py-2 !text-[12px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Include dates, location and observable facts. Do not make allegations you cannot support." />
                </div>
                <label className="flex items-start gap-2 text-[10px] text-ink-500">
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-0.5 h-3.5 w-3.5" />
                  Show this report publicly with my display name.
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" loading={submitting}>Submit report</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="card p-5">
            <h3 className="font-display text-lg">Sign in to report an issue</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              Complaints are attributed to a verified account so officials can respond.
              Sign in or create a free account.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link to={`/login?next=${encodeURIComponent(`/projects/${project.id}?tab=complaints`)}`} className="btn btn-primary btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-outline btn-sm">Create an account</Link>
            </div>
          </section>
        )}

        <section className="card p-5">
          <h3 className="font-display text-lg">How complaints work</h3>
          <ol className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-ink-500">
            <li><strong className="text-navy-900">1.</strong> A signed-in citizen files a report.</li>
            <li><strong className="text-navy-900">2.</strong> An official or administrator reviews it.</li>
            <li><strong className="text-navy-900">3.</strong> Status and response are recorded publicly.</li>
            <li><strong className="text-navy-900">4.</strong> Resolution rates are computed from these reports only.</li>
          </ol>
          <p className="mt-3 border-t hairline pt-2 text-[9.5px] text-ink-400">
            Samaj Darpan does not forward complaints to government departments
            automatically. It is a public record, not an official grievance channel.
          </p>
        </section>
      </aside>
    </div>
  );
}

function InlineComplaintReview({
  complaint,
  onUpdated,
}: {
  complaint: Complaint;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [note, setNote] = useState(complaint.resolutionNote ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty =
    status !== complaint.status || note.trim() !== (complaint.resolutionNote ?? "");

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      await apiFetch(`/complaints/${complaint.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          resolutionNote: note.trim() ? note.trim() : null,
        }),
      });
      toast.push("Complaint status updated", { tone: "success" });
      onUpdated();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update complaint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2.5 rounded-lg border border-navy-900/10 bg-cream-50 p-2.5">
      {err ? <p className="mb-1.5 text-[10.5px] font-semibold text-red-700">{err}</p> : null}
      <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
          className="input !py-1.5 !text-[11px]"
          aria-label="Update complaint status"
        >
          <option value="open">Open</option>
          <option value="in-review">In review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Official response note (optional)"
          className="input !py-1.5 !text-[11px]"
          aria-label="Official response note"
        />
        <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ── Small components ─────────────────────────────────────────────────── */

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-ink-400">{label}</p>
      {value ? (
        <p className="mt-0.5 text-[12px] font-semibold leading-snug text-ink-700">{value}</p>
      ) : (
        <p className="mt-0.5 text-[11px] italic text-ink-400">Information not publicly available.</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] text-ink-400">{label}</span>
      <span className="text-right text-[10.5px] font-semibold text-ink-700">{children}</span>
    </div>
  );
}

function MoneyBox({ label, value, note }: { label: string; value: number | null; note?: string }) {
  return (
    <div className="rounded-lg border border-navy-900/10 bg-cream-50/60 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.11em] text-ink-400">{label}</p>
      {value === null ? (
        <p className="mt-1 text-[11px] italic text-ink-400">Information not publicly available.</p>
      ) : (
        <>
          <p className="mt-1 font-display text-xl text-navy-900">{formatINRCompact(value)}</p>
          <p className="text-[9px] text-ink-400">{formatINR(value)}</p>
        </>
      )}
      {note ? <p className="mt-1 text-[8.5px] leading-relaxed text-ink-400">{note}</p> : null}
    </div>
  );
}

function FundingRow({ label, value }: { label: string; value: number | null }) {
  return (
    <tr>
      <td className="px-3 py-2 text-ink-600">{label}</td>
      <td className="px-3 py-2 text-right font-semibold text-navy-900">
        {value === null ? <span className="text-[10px] italic text-ink-400">Not published</span> : formatINRCompact(value)}
      </td>
    </tr>
  );
}

function FundingLine({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy-900/5 pb-2 last:border-0">
      <span className="text-[10.5px] text-ink-500">{label}</span>
      <span className="text-[11px] font-bold text-navy-900">
        {value === null ? <span className="text-[9.5px] font-normal italic text-ink-400">Not published</span> : formatINRCompact(value)}
      </span>
    </div>
  );
}

function ChainNode({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="mt-1 h-2 w-2 rounded-full bg-teal-400" />
        {!last ? <span className="w-px flex-1 bg-white/20" /> : null}
      </div>
      <div className={last ? "pb-0" : "pb-3"}>
        <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-cream-50/40">{label}</p>
        <p className={cn("text-[11.5px] font-semibold", value ? "text-cream-50/90" : "italic text-cream-50/35")}>
          {value ?? "Not published"}
        </p>
      </div>
    </div>
  );
}

function Chain({ project }: { project: Project }) {
  const nodes = [
    ["Sanctioning authority", project.responsibility.sanctioningAuthority],
    ["Executing agency", project.responsibility.executingAgency],
    ["Tendering authority", project.responsibility.tenderingAuthority],
    ["Supervising department", project.responsibility.supervisingDepartment],
    ["Contractor", project.responsibility.contractor],
  ] as const;
  return (
    <div className="space-y-0">
      {nodes.map(([label, value], index) => (
        <div key={label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 ${value ? "border-teal-500 bg-white" : "border-ink-300 bg-cream-100"}`} />
            {index < nodes.length - 1 ? <span className="w-px flex-1 bg-cream-300" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">{label}</p>
            {value ? (
              <p className="text-[12px] font-semibold text-ink-700">{value}</p>
            ) : (
              <p className="text-[10.5px] italic text-ink-400">Not published</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color: "teal" | "navy";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold text-ink-600">{label}</p>
        <p className="text-[11px] font-bold text-navy-900">
          {value === null ? "Not published" : formatPercent(value)}
        </p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-200">
        {value !== null ? (
          <div
            className={`h-full rounded-full ${color === "teal" ? "bg-teal-500" : "bg-navy-800"}`}
            style={{ width: `${value}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}

function HistoryRow({ date, title, detail }: { date: string; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-cream-50 px-3 py-2">
      <Clock3 size={13} className="mt-0.5 shrink-0 text-ink-400" />
      <div>
        <p className="text-[11px] font-bold text-navy-900">{title}</p>
        <p className="text-[9.5px] text-ink-400">{detail} · {formatDate(date)} ({relativeDate(date)})</p>
      </div>
    </div>
  );
}

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" />
      ) : (
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-ink-300" />
      )}
      <span className={ok ? "text-ink-600" : "text-ink-400"}>{label}</span>
    </li>
  );
}
