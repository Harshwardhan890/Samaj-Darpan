import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileWarning,
  Globe2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { DataClass, SourceConnectorStatus } from "@shared/types";
import {
  DATA_CLASS_DESCRIPTIONS,
  DATA_CLASS_LABELS,
  formatDate,
  relativeDate,
} from "@shared/format";
import {
  Badge,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SourceLine,
  cn,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useApiData } from "@/hooks/useApiData";

const ACCESS_LABEL: Record<SourceConnectorStatus["access"], string> = {
  api: "Documented API",
  download: "Permitted download",
  manual: "Administrator import",
};

const ACCESS_ICON = {
  api: Terminal,
  download: Download,
  manual: Database,
} as const;

const DATA_CLASSES: DataClass[] = [
  "official",
  "imported",
  "admin-verified",
  "user-submitted",
  "demonstration",
];

export default function SourcesPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useApiData<{
    sources: SourceConnectorStatus[];
    note: string;
  }>("/sources");

  return (
    <div>
      <PageHeader
        eyebrow="Data & methods"
        title="Sources and coverage"
        description="Where the records come from, what each source can provide, and what is still missing. Samaj Darpan does not scrape restricted portals and never fabricates a value to fill a gap."
        actions={
          <Badge tone="navy">
            <Database size={11} /> {data?.sources.length ?? 0} source families
          </Badge>
        }
      />

      <div className="container-page py-6">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {loading ? (
              <LoadingBlock rows={4} />
            ) : error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : (
              data?.sources.map((source) => {
                const AccessIcon = ACCESS_ICON[source.access];
                return (
                  <article key={source.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-ink-600">
                          <Globe2 size={17} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="font-display text-[1.15rem] leading-snug text-navy-900">
                            {source.name}
                          </h2>
                          <p className="text-[10.5px] text-ink-400">
                            {source.organisation}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={source.configured ? "teal" : "neutral"}>
                          <AccessIcon size={10} />
                          {ACCESS_LABEL[source.access]}
                        </Badge>
                        <Badge
                          tone={
                            source.lastRunStatus === "success"
                              ? "green"
                              : source.lastRunStatus === "partial"
                                ? "amber"
                                : source.lastRunStatus === "failed"
                                  ? "red"
                                  : "neutral"
                          }
                        >
                          {source.lastRunStatus === "never"
                            ? "Not yet run"
                            : source.lastRunStatus}
                        </Badge>
                      </div>
                    </div>

                    <p className="mt-3 text-[11.5px] leading-relaxed text-ink-500">
                      {source.description}
                    </p>

                    <dl className="mt-3 grid gap-2 border-t hairline pt-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                          Coverage
                        </dt>
                        <dd className="mt-0.5 text-[10.5px] leading-snug text-ink-600">
                          {source.coverage}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                          Records in platform
                        </dt>
                        <dd className="mt-0.5 text-[12px] font-bold text-navy-900">
                          {source.totalRecords}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
                          Last run
                        </dt>
                        <dd className="mt-0.5 text-[10.5px] text-ink-600">
                          {source.lastRunAt
                            ? `${formatDate(source.lastRunAt)} (${relativeDate(source.lastRunAt)})`
                            : "Never"}
                          {source.recordsLastRun > 0
                            ? ` · ${source.recordsLastRun} records`
                            : ""}
                        </dd>
                      </div>
                    </dl>

                    <div
                      className={cn(
                        "mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[10.5px] leading-relaxed",
                        source.configured
                          ? "bg-teal-50/70 text-teal-800"
                          : "bg-cream-50 text-ink-500",
                      )}
                    >
                      {source.configured ? (
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      ) : (
                        <LockKeyhole size={13} className="mt-0.5 shrink-0" />
                      )}
                      <p>
                        {source.configuredNote}
                        {source.lastRunMessage ? ` Last message: ${source.lastRunMessage}` : ""}
                      </p>
                    </div>

                    <a
                      href={source.homepage}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700 hover:text-teal-600"
                    >
                      Visit source portal <ArrowUpRight size={10} />
                    </a>
                  </article>
                );
              })
            )}

            <div className="card p-5">
              <div className="flex items-start gap-2.5">
                <FileWarning size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="font-display text-lg">Why some sources have no live feed</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    Several Indian public portals publish project monitoring data only as
                    HTML dashboards or downloadable reports. Where no documented public API
                    exists, Samaj Darpan supports a controlled administrator import instead
                    of scraping the portal. That keeps provenance visible and avoids
                    violating access conditions.
                  </p>
                </div>
              </div>
              {user?.role === "admin" ? (
                <Link to="/admin/sources" className="btn btn-outline btn-sm mt-3">
                  <RefreshCw size={13} /> Manage source refreshes
                </Link>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="card p-5">
              <h2 className="font-display text-lg">What the labels mean</h2>
              <ul className="mt-3 space-y-3">
                {DATA_CLASSES.map((dataClass) => (
                  <li key={dataClass}>
                    <p className="text-[11.5px] font-bold text-navy-900">
                      {DATA_CLASS_LABELS[dataClass]}
                    </p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-500">
                      {DATA_CLASS_DESCRIPTIONS[dataClass]}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg">Verification workflow</h2>
              <ol className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-ink-500">
                <li><strong className="text-navy-900">Imported.</strong> A public file or API record enters the platform.</li>
                <li><strong className="text-navy-900">Under review.</strong> An administrator checks the record against the cited source.</li>
                <li><strong className="text-navy-900">Verified.</strong> The record has been checked and its source attached.</li>
                <li><strong className="text-navy-900">Published.</strong> The verified record can be distributed publicly with attribution.</li>
              </ol>
              <Link
                to="/methodology"
                className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-teal-700"
              >
                Read the full methodology <ArrowUpRight size={10} />
              </Link>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg">Corrections</h2>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
                If a record is wrong, report it on the project page or contact an
                administrator. Corrections require a public source and are recorded in the
                audit log with the account that made them.
              </p>
            </section>
          </aside>
        </div>

        <div className="mt-6 rounded-xl border border-navy-900/10 bg-white p-4">
          <p className="text-[11px] leading-relaxed text-ink-500">
            <strong className="text-navy-900">Data availability statement.</strong>{" "}
            {data?.note ??
              "Sources without a documented public API are supported through the administrator import pipeline."}{" "}
            Absence of a record does not mean a project does not exist. It means the
            platform has not found a permitted public source for it yet.
          </p>
          <SourceLine
            className="mt-2"
            organisation="Samaj Darpan source registry"
            url={null}
            retrievedAt={new Date().toISOString()}
          />
        </div>
      </div>
    </div>
  );
}
