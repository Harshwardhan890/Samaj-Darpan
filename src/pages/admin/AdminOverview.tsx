import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FileUp,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type {
  AuditEntry,
  ImportJob,
  Project,
  SourceConnectorStatus,
  VerificationStatus,
} from "@shared/types";
import { formatDate, formatPercent, relativeDate } from "@shared/format";
import {
  Badge,
  DataClassBadge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Stat,
  VerificationBadge,
} from "@/components/ui";

interface OverviewResponse {
  counts: {
    total: number;
    official: number;
    demonstration: number;
    pending: number;
    verified: number;
    published: number;
    outdated: number;
    missingCoordinates: number;
    missingFinancials: number;
    missingContractor: number;
    users: number;
    imports: number;
  };
  verificationQueue: Project[];
  duplicateGroups: {
    key: string;
    name: string;
    ids: string[];
    statuses: VerificationStatus[];
  }[];
  sources: SourceConnectorStatus[];
  recentImports: ImportJob[];
  recentAudit: AuditEntry[];
  dataQuality: {
    coordinateCoverage: number | null;
    financialCoverage: number | null;
    contractorCoverage: number | null;
  };
}

import { useApiData } from "@/hooks/useApiData";

export default function AdminOverviewPage() {
  const { data, loading, error, refresh } = useApiData<OverviewResponse>("/admin/overview");

  if (loading) return <LoadingBlock rows={4} />;
  if (error || !data) {
    return <ErrorState message={error ?? "Could not load the admin overview."} onRetry={refresh} />;
  }

  const { counts, dataQuality } = data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total records"
          value={counts.total}
          detail={`${counts.official} sourced · ${counts.demonstration} demonstration`}
          icon={<Database size={16} />}
        />
        <Stat
          label="Awaiting review"
          value={counts.pending}
          detail="Imported or under review"
          icon={<ClipboardCheck size={16} />}
          tone={counts.pending > 0 ? "amber" : "green"}
        />
        <Stat
          label="Verified / published"
          value={`${counts.verified} / ${counts.published}`}
          detail={`${counts.outdated} marked outdated`}
          icon={<ShieldCheck size={16} />}
          tone="teal"
        />
        <Stat
          label="Accounts"
          value={counts.users}
          detail={`${counts.imports} import jobs recorded`}
          icon={<Users size={16} />}
        />
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Data coverage</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Share of sourced records (demonstration records excluded) with a published
              value. Missing is not estimated.
            </p>
          </div>
          <Link to="/admin/projects" className="btn btn-outline btn-sm">
            Review records <ArrowRight size={12} />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Coverage label="Coordinates published" value={dataQuality.coordinateCoverage} icon={<MapPin size={14} />} />
          <Coverage label="Approved cost published" value={dataQuality.financialCoverage} icon={<Wallet size={14} />} />
          <Coverage label="Contractor named" value={dataQuality.contractorCoverage} icon={<TrendingUp size={14} />} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t hairline pt-3">
          <Link to="/admin/import" className="btn btn-primary btn-sm">
            <FileUp size={13} /> Import a dataset
          </Link>
          <Link to="/admin/sources" className="btn btn-outline btn-sm">
            <Database size={13} /> Run source refresh
          </Link>
          <Link to="/admin/audit" className="btn btn-ghost btn-sm">
            View audit log
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Verification queue</h2>
            <Badge tone={counts.pending > 0 ? "amber" : "green"}>{counts.pending} pending</Badge>
          </div>
          {data.verificationQueue.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<CheckCircle2 size={19} />}
              title="Nothing waiting for review"
              description="Imported records appear here until an administrator verifies or rejects them."
            />
          ) : (
            <ul className="mt-3 divide-y divide-navy-900/8">
              {data.verificationQueue.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-navy-900">
                      {project.name}
                    </p>
                    <p className="text-[9.5px] text-ink-400">
                      {project.city ?? project.state} · {project.sourceOrganisation} ·{" "}
                      {relativeDate(project.lastUpdated)}
                    </p>
                  </div>
                  <DataClassBadge dataClass={project.dataClass} />
                  <VerificationBadge status={project.verificationStatus} />
                  <Link
                    to={`/admin/projects?q=${encodeURIComponent(project.id)}`}
                    className="text-[10px] font-bold text-teal-700"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Possible duplicates</h2>
            <Badge tone={data.duplicateGroups.length ? "amber" : "neutral"}>
              {data.duplicateGroups.length}
            </Badge>
          </div>
          {data.duplicateGroups.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<Copy size={19} />}
              title="No duplicate candidates"
              description="Duplicate detection compares normalised names within the same city."
            />
          ) : (
            <ul className="mt-3 space-y-2">
              {data.duplicateGroups.map((group) => (
                <li key={group.key} className="rounded-lg border border-amber-500/25 bg-amber-50/50 p-2.5">
                  <p className="line-clamp-1 text-[11.5px] font-bold text-navy-900">
                    {group.name}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-ink-500">
                    {group.ids.length} records · {group.ids.join(", ")}
                  </p>
                  <Link
                    to={`/admin/projects?q=${encodeURIComponent(group.name)}`}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700"
                  >
                    Resolve in projects <ArrowRight size={10} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Source status</h2>
            <Link to="/admin/sources" className="text-[10px] font-bold text-teal-700">
              Manage
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {data.sources.map((source) => (
              <li key={source.id} className="flex items-start justify-between gap-2 rounded-lg border border-navy-900/8 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-navy-900">{source.name}</p>
                  <p className="text-[9.5px] text-ink-400">
                    {source.lastRunAt ? `Last run ${relativeDate(source.lastRunAt)}` : "Never run"} ·{" "}
                    {source.totalRecords} records
                  </p>
                </div>
                <Badge
                  tone={
                    source.lastRunStatus === "success"
                      ? "green"
                      : source.lastRunStatus === "failed"
                        ? "red"
                        : source.lastRunStatus === "partial"
                          ? "amber"
                          : "neutral"
                  }
                >
                  {source.lastRunStatus}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl">Recent imports</h2>
            <Link to="/admin/import" className="text-[10px] font-bold text-teal-700">
              Import
            </Link>
          </div>
          {data.recentImports.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<FileUp size={19} />}
              title="No imports yet"
              description="Upload a CSV or XLSX extract to create imported records."
            />
          ) : (
            <ul className="mt-3 divide-y divide-navy-900/8">
              {data.recentImports.map((job) => (
                <li key={job.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold text-navy-900">{job.fileName}</p>
                    <Badge tone={job.status === "committed" ? "green" : job.status === "failed" ? "red" : "amber"}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-[9.5px] text-ink-400">
                    {job.rowCount} rows · {job.created} created · {job.updated} updated ·{" "}
                    {job.duplicateCandidates} duplicate candidates · {relativeDate(job.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl">Recent audit activity</h2>
          <Link to="/admin/audit" className="text-[10px] font-bold text-teal-700">
            Full log
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-navy-900/8">
          {data.recentAudit.length === 0 ? (
            <li className="py-4 text-center text-[11px] text-ink-400">No activity recorded.</li>
          ) : (
            data.recentAudit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink-700">{entry.summary}</p>
                  <p className="text-[9.5px] text-ink-400">
                    {entry.actorName} · {entry.action} · {formatDate(entry.createdAt)}
                  </p>
                </div>
                <Badge tone="neutral">{entry.entityType}</Badge>
              </li>
            ))
          )}
        </ul>
      </section>

      {counts.outdated > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50/70 px-4 py-3 text-[11px] leading-relaxed text-[#6b5412]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            {counts.outdated} record{counts.outdated === 1 ? " is" : "s are"} marked
            outdated. Re-check the cited source before relying on those figures.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Coverage({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-600">
          <span className="text-teal-600">{icon}</span>
          {label}
        </p>
        <p className="text-[10.5px] font-bold text-navy-900">
          {value === null ? "No records" : formatPercent(value)}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}
