import { useState } from "react";
import {
  CheckCircle2,
  Database,
  ExternalLink,
  LockKeyhole,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import type { SourceConnectorStatus } from "@shared/types";
import { formatDate, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { ApiError, apiFetch } from "@/services/api";

export default function AdminSourcesPage() {
  const toast = useToast();
  const { data, loading, error, refresh } = useApiData<{
    sources: SourceConnectorStatus[];
    note: string;
  }>("/sources");
  const [pending, setPending] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  const runOne = async (source: SourceConnectorStatus) => {
    setPending(source.id);
    try {
      const response = await apiFetch<{
        run: { message: string; records: number; status: string };
        outcome: { created: number; updated: number; skipped: number };
        errors?: string[];
      }>(`/admin/sources/${source.id}/run`, { method: "POST" });
      toast.push(`Refreshed ${source.name}`, {
        description: `${response.run.message} · ${response.outcome.created} created, ${response.outcome.updated} updated.`,
        tone: response.run.status === "success" ? "success" : "warning",
      });
      refresh();
    } catch (err) {
      toast.push("Source refresh failed", {
        description: err instanceof ApiError ? err.message : "The connector did not complete.",
        tone: "error",
      });
      refresh();
    } finally {
      setPending(null);
    }
  };

  const refreshAll = async () => {
    setRefreshingAll(true);
    try {
      const response = await apiFetch<{
        results: { sourceId: string; ok: boolean; message: string }[];
      }>("/admin/sources/refresh-all", { method: "POST" });
      const ok = response.results.filter((result) => result.ok).length;
      toast.push("Refresh completed", {
        description: `${ok} of ${response.results.length} sources returned records.`,
        tone: ok > 0 ? "success" : "warning",
      });
      refresh();
    } catch (err) {
      toast.push("Refresh failed", {
        description: err instanceof ApiError ? err.message : "Try again later.",
        tone: "error",
      });
    } finally {
      setRefreshingAll(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · data pipeline"
        title="Data sources"
        description="Documented APIs can be refreshed from here. Portals without a public API must be imported from a permitted download — the platform will not scrape them."
        actions={
          <Button
            onClick={refreshAll}
            loading={refreshingAll}
            icon={<RefreshCw size={13} />}
          >
            Refresh all configured
          </Button>
        }
      />

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <div className="space-y-3">
          {data?.sources.map((source) => (
            <article key={source.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-ink-600">
                    <Database size={17} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.1rem] leading-snug">{source.name}</h2>
                    <p className="text-[10px] text-ink-400">{source.organisation}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={source.configured ? "teal" : "neutral"}>
                    {source.configured ? (
                      <CheckCircle2 size={10} />
                    ) : (
                      <LockKeyhole size={10} />
                    )}
                    {source.configured ? "Configured" : "Not configured"}
                  </Badge>
                  <Badge tone={source.access === "api" ? "navy" : source.access === "download" ? "teal" : "neutral"}>
                    {source.access === "api"
                      ? "API"
                      : source.access === "download"
                        ? "Download"
                        : "Manual import"}
                  </Badge>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                {source.description}
              </p>

              <div className="mt-3 grid gap-2 border-t hairline pt-3 sm:grid-cols-4">
                <Field label="Records" value={String(source.totalRecords)} />
                <Field
                  label="Last run"
                  value={
                    source.lastRunAt
                      ? `${formatDate(source.lastRunAt)} (${relativeDate(source.lastRunAt)})`
                      : "Never"
                  }
                />
                <Field label="Last status" value={source.lastRunStatus} />
                <Field label="Records last run" value={String(source.recordsLastRun)} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {source.access === "api" && source.configured ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={pending === source.id}
                    onClick={() => runOne(source)}
                    icon={<RefreshCw size={12} />}
                  >
                    Run refresh
                  </Button>
                ) : (
                  <Badge tone="amber">
                    <AlertTriangle size={10} /> Manual import only
                  </Badge>
                )}
                <a
                  href={source.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-ghost btn-sm"
                >
                  Portal <ExternalLink size={11} />
                </a>
                <span className="text-[9.5px] text-ink-400">{source.configuredNote}</span>
              </div>

              {source.lastRunMessage ? (
                <p className="mt-2 rounded-md bg-cream-50 px-2.5 py-1.5 text-[10px] text-ink-500">
                  Last message: {source.lastRunMessage}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-navy-900/10 bg-white p-4">
        <p className="text-[11px] leading-relaxed text-ink-500">
          <strong className="text-navy-900">Operational note.</strong>{" "}
          {data?.note ??
            "Sources without a documented public API are supported through the administrator import pipeline."}{" "}
          Automatic refresh is disabled by default and must be enabled explicitly with
          ENABLE_AUTO_REFRESH. Running a refresh does not verify records; it imports or updates
          them as imported data.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-[10.5px] font-semibold text-ink-700">{value}</p>
    </div>
  );
}
