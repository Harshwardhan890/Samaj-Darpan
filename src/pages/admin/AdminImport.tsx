import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  UploadCloud,
} from "lucide-react";
import type { DataClass, ImportJob } from "@shared/types";
import { formatDate, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { ApiError, apiFetch } from "@/services/api";

const TEMPLATE_COLUMNS = [
  "project_name",
  "description",
  "state",
  "city",
  "district",
  "category",
  "status",
  "approved_cost_crore",
  "revised_cost_crore",
  "expenditure_crore",
  "start_date",
  "expected_completion",
  "actual_completion",
  "physical_progress_percent",
  "financial_progress_percent",
  "contractor",
  "executing_department",
  "funding_authority",
  "implementing_agency",
  "latitude",
  "longitude",
  "project_id",
];

interface ImportResponse {
  job: ImportJob;
  outcome: {
    created: number;
    updated: number;
    skipped: number;
    duplicateCandidates: unknown[];
    projectIds: string[];
  };
}

export default function AdminImportPage() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [organisation, setOrganisation] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [dataClass, setDataClass] = useState<DataClass>("imported");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const history = useApiData<{ imports: ImportJob[] }>("/admin/imports");

  const chooseFile = (next: File | null) => {
    setError(null);
    setResult(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!/\.(csv|xlsx|xls)$/i.test(next.name)) {
      setError("Choose a .csv, .xlsx or .xls file.");
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setError("The file must be 8 MB or smaller.");
      return;
    }
    setFile(next);
  };

  const downloadTemplate = () => {
    const csv = `${TEMPLATE_COLUMNS.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "samaj-darpan-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Choose a CSV or XLSX file to import.");
      return;
    }
    if (!organisation.trim()) {
      setError("Name the source organisation so the record carries attribution.");
      return;
    }
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
      setError("The source URL must start with http:// or https://.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    body.append("sourceOrganisation", organisation.trim());
    body.append("sourceUrl", sourceUrl.trim());
    body.append("dataClass", dataClass);
    setSubmitting(true);
    try {
      const response = await apiFetch<ImportResponse>("/admin/import", {
        method: "POST",
        body,
      });
      setResult(response);
      history.refresh();
      toast.push("Import committed", {
        description: `${response.outcome.created} created, ${response.outcome.updated} updated.`,
        tone: "success",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The import could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · data pipeline"
        title="Import public records"
        description="Upload a permitted CSV or XLSX extract. Columns are matched by name, money is parsed only when the column declares a currency unit, and every row is deduplicated before it is stored."
        actions={<Badge tone="navy">Max 2,000 rows · 8 MB</Badge>}
      />

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-xl">1. Choose a file</h2>
          <p className="mt-1 text-[11px] text-ink-400">
            CSV, XLSX or XLS. The first row must contain column headers.
          </p>

          <div
            className="mt-4 rounded-xl border-2 border-dashed border-navy-900/15 bg-cream-50/60 px-5 py-8 text-center transition hover:border-teal-500/40"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              chooseFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <UploadCloud size={28} className="mx-auto text-teal-600" />
            {file ? (
              <>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-navy-900">
                  <FileSpreadsheet size={14} /> {file.name}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => chooseFile(null)}
                >
                  Remove file
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-[12.5px] font-bold text-navy-900">
                  Drop a file here, or browse
                </p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  Nothing is uploaded until you commit the import.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => inputRef.current?.click()}
                  icon={<FileUp size={13} />}
                >
                  Browse files
                </Button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="organisation" className="field-label">
                Source organisation *
              </label>
              <input
                id="organisation"
                className="input !py-2 !text-[12px]"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                placeholder="e.g. Municipal Corporation of Delhi"
              />
            </div>
            <div>
              <label htmlFor="source-url" className="field-label">
                Source URL
              </label>
              <input
                id="source-url"
                className="input !py-2 !text-[12px]"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://…"
              />
              <p className="mt-1 text-[9px] text-ink-400">
                Links the record to the published document it came from.
              </p>
            </div>
            <div>
              <label htmlFor="data-class" className="field-label">
                Data classification
              </label>
              <select
                id="data-class"
                className="input !py-2 !text-[12px]"
                value={dataClass}
                onChange={(event) => setDataClass(event.target.value as DataClass)}
              >
                <option value="imported">Imported public record</option>
                <option value="official">Official government data</option>
                <option value="admin-verified">Administrator-verified</option>
              </select>
              <p className="mt-1 text-[9px] text-ink-400">
                “Official” should be used only for unmodified government data.
              </p>
            </div>
          </div>

          {error ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="submit" loading={submitting} icon={<UploadCloud size={14} />}>
              Commit import
            </Button>
            <Button type="button" variant="outline" onClick={downloadTemplate} icon={<Download size={13} />}>
              Download column template
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="font-display text-lg">Column matching</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">
              Header names are matched case-insensitively and ignore punctuation. These are
              recognised aliases:
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {TEMPLATE_COLUMNS.map((column) => (
                <code
                  key={column}
                  className="rounded border border-navy-900/10 bg-cream-50 px-1.5 py-0.5 text-[9px] text-ink-600"
                >
                  {column}
                </code>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-1.5 font-display text-lg">
              <Info size={15} className="text-amber-600" /> Import rules
            </h2>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-ink-500">
              <li>
                <strong className="text-navy-900">Money needs a unit.</strong> A column called
                “approved_cost_crore” is multiplied by 10 million. A bare “cost” column is left
                blank with a warning rather than guessed.
              </li>
              <li>
                <strong className="text-navy-900">No inferred coordinates.</strong> Latitude and
                longitude are accepted only inside India's bounding box; otherwise the record
                is stored without a location.
              </li>
              <li>
                <strong className="text-navy-900">New records start as Imported.</strong> An
                administrator must review them before they can be published.
              </li>
              <li>
                <strong className="text-navy-900">Duplicates are flagged, not silently merged.</strong>{" "}
                Use the duplicate panel on the projects page to merge them.
              </li>
            </ul>
          </section>
        </aside>
      </form>

      {result ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl">
                <CheckCircle2 size={18} className="text-teal-600" /> Import result
              </h2>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {result.job.fileName} · {formatDate(result.job.createdAt)} ·{" "}
                {result.job.createdBy}
              </p>
            </div>
            <Badge tone={result.job.status === "committed" ? "green" : "amber"}>
              {result.job.status}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Metric label="Rows" value={result.job.rowCount} />
            <Metric label="Created" value={result.outcome.created} tone="teal" />
            <Metric label="Updated" value={result.outcome.updated} tone="navy" />
            <Metric
              label="Duplicate candidates"
              value={result.outcome.duplicateCandidates.length}
              tone={result.outcome.duplicateCandidates.length ? "amber" : "neutral"}
            />
          </div>

          {result.job.errors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50/60 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6b5412]">
                Warnings ({result.job.errors.length})
              </p>
              <ul className="mt-1.5 max-h-52 space-y-1 overflow-y-auto">
                {result.job.errors.map((warning, index) => (
                  <li key={index} className="text-[10.5px] leading-relaxed text-[#6b5412]">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin/projects?verification=imported" className="btn btn-primary btn-sm">
              Review imported records
            </Link>
            <Link to="/admin/projects" className="btn btn-outline btn-sm">
              Open all records
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Import history</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Previous administrator imports and their validation outcomes.
            </p>
          </div>
          <Badge tone="neutral">{history.data?.imports.length ?? 0} jobs</Badge>
        </div>

        {(history.data?.imports.length ?? 0) === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<FileUp size={19} />}
            title="No imports recorded yet"
            description="Uploaded CSV or XLSX extracts will appear here with their row counts and warnings."
          />
        ) : (
          <ul className="mt-3 divide-y divide-navy-900/8">
            {history.data?.imports.map((job) => (
              <li key={job.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-bold text-navy-900">{job.fileName}</p>
                    <p className="text-[10px] text-ink-400">
                      {job.sourceOrganisation} · by {job.createdBy} · {formatDate(job.createdAt)} (
                      {relativeDate(job.createdAt)})
                    </p>
                  </div>
                  <Badge
                    tone={
                      job.status === "committed"
                        ? "green"
                        : job.status === "failed"
                          ? "red"
                          : "amber"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
                <p className="mt-1 text-[10.5px] text-ink-500">
                  {job.rowCount} rows · {job.created} created · {job.updated} updated ·{" "}
                  {job.duplicateCandidates} duplicate candidates
                  {job.errors.length > 0 ? ` · ${job.errors.length} warning(s)` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "teal" | "navy" | "amber" | "neutral";
}) {
  const color =
    tone === "teal"
      ? "text-teal-700"
      : tone === "navy"
        ? "text-navy-900"
        : tone === "amber"
          ? "text-amber-700"
          : "text-ink-700";
  return (
    <div className="rounded-lg border border-navy-900/10 bg-cream-50/50 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className={`mt-0.5 font-display text-xl ${color}`}>{value}</p>
    </div>
  );
}
