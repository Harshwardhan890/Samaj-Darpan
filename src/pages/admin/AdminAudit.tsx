import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ScrollText,
} from "lucide-react";
import type { AuditEntry } from "@shared/types";
import { formatDate, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useApiData } from "@/hooks/useApiData";

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const ENTITY_TONE = {
  project: "navy",
  complaint: "amber",
  representative: "violet",
  import: "teal",
  source: "green",
  auth: "neutral",
} as const;

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, loading, error, refresh } = useApiData<AuditResponse>(
    `/admin/audit?page=${page}&pageSize=50`,
    [page],
  );

  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.entries ?? []).filter((entry) =>
      needle
        ? [entry.actorName, entry.action, entry.summary, entry.entityId]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)
        : true,
    );
  }, [data?.entries, q]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · accountability"
        title="Audit log"
        description="An append-oriented record of administrative actions. Before and after values are retained for project and user changes."
        actions={<Badge tone="navy"><ScrollText size={11} /> {data?.total ?? 0} entries</Badge>}
      />

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Filter by actor, action or summary…"
              className="input !py-2 !pl-8 !text-[12px]"
              aria-label="Filter audit entries"
            />
          </div>
          <p className="ml-auto text-[10.5px] text-ink-400">
            Page {data?.page ?? 1} of {totalPages}
          </p>
        </div>
      </section>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText size={20} />}
          title="No audit entries match"
          description="Clear the filter or perform an administrative action to create a record."
        />
      ) : (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-navy-900/8">
            {entries.map((entry) => (
              <li key={entry.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-navy-900">{entry.summary}</p>
                    <p className="mt-0.5 text-[9.5px] text-ink-400">
                      {entry.actorName} · <code>{entry.action}</code> ·{" "}
                      {formatDate(entry.createdAt)} ({relativeDate(entry.createdAt)})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={ENTITY_TONE[entry.entityType] ?? "neutral"}>
                      {entry.entityType}
                    </Badge>
                    <code className="rounded bg-cream-50 px-1.5 py-0.5 text-[9px] text-ink-400">
                      {entry.entityId}
                    </code>
                  </div>
                </div>
                {entry.before || entry.after ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[10px] font-bold text-teal-700">
                      View before / after values
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-navy-900/10 bg-cream-50 p-2.5">
                        <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                          Before
                        </p>
                        <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-all text-[9px] leading-relaxed text-ink-600">
                          {entry.before ? JSON.stringify(entry.before, null, 2) : "—"}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-navy-900/10 bg-cream-50 p-2.5">
                        <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
                          After
                        </p>
                        <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-all text-[9px] leading-relaxed text-ink-600">
                          {entry.after ? JSON.stringify(entry.after, null, 2) : "—"}
                        </pre>
                      </div>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
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
      )}

      <p className="text-[10px] leading-relaxed text-ink-400">
        The audit log is intended to make administrative decisions reviewable. It is not a
        cryptographic immutable ledger; operators with direct database access can alter the
        stored JSON. Production deployments should ship this stream to append-only storage.
      </p>
    </div>
  );
}
