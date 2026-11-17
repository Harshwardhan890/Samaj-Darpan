import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Filter,
  MessageSquarePlus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Complaint, ComplaintStatus } from "@shared/types";
import { CITIES } from "@shared/cities";
import { formatDate, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  cn,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { ApiError, apiFetch, qs } from "@/services/api";

const STATUS_TONE: Record<ComplaintStatus, "amber" | "teal" | "green" | "red"> = {
  open: "amber",
  "in-review": "teal",
  resolved: "green",
  rejected: "red",
};

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  open: "Open",
  "in-review": "In review",
  resolved: "Resolved",
  rejected: "Rejected",
};

const CATEGORY_LABEL: Record<Complaint["category"], string> = {
  quality: "Construction quality",
  delay: "Delay in delivery",
  safety: "Public safety",
  cost: "Cost or transparency",
  accessibility: "Accessibility",
  corruption: "Irregularity concern",
  other: "Other",
};

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { city, cityName } = useCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const canReview = user?.role === "official" || user?.role === "admin";
  const defaultTab = canReview && searchParams.get("queue") === "official" ? "review" : "public";
  const tab = requested ?? defaultTab;
  const [statusFilter, setStatusFilter] = useState<"all" | ComplaintStatus>("all");

  const scope = qs({ state: city?.stateSlug, city: city?.slug });

  const publicData = useApiData<{ complaints: Complaint[]; total: number }>(
    `/complaints${scope}`,
    [scope],
  );
  const mineData = useApiData<{ complaints: Complaint[]; total: number }>(
    user ? "/complaints/mine" : null,
    [user?.id],
  );

  const reviewScope = useMemo(() => {
    if (!user) return scope;
    if (city?.stateSlug) return scope;
    if (user.role === "official" && user.state) {
      const match = CITIES.find((candidate) => candidate.state === user.state);
      if (match) return qs({ state: match.stateSlug });
    }
    return scope;
  }, [city?.stateSlug, scope, user]);

  const reviewPath = canReview
    ? `/complaints?all=true${reviewScope ? `&${reviewScope.slice(1)}` : ""}`
    : null;
  const reviewData = useApiData<{ complaints: Complaint[]; total: number }>(
    reviewPath,
    [user?.id, reviewPath],
  );

  const setTab = (next: string) => {
    const updated = new URLSearchParams(searchParams);
    updated.set("tab", next);
    updated.delete("queue");
    setSearchParams(updated, { replace: true });
  };

  const activeData =
    tab === "mine" ? mineData : tab === "review" ? reviewData : publicData;
  const complaints = useMemo(() => {
    const list = activeData.data?.complaints ?? [];
    if (statusFilter === "all") return list;
    return list.filter((complaint) => complaint.status === statusFilter);
  }, [activeData.data?.complaints, statusFilter]);

  return (
    <div>
      <PageHeader
        eyebrow={city ? `${city.state} · ${city.name}` : "All India"}
        title="Citizen complaints"
        description="Public reports filed by signed-in citizens. A complaint is a citizen observation, not a government finding. Official responses are recorded with the responding account."
        actions={
          <>
            <Badge tone="navy">
              <ClipboardList size={11} /> {publicData.data?.total ?? 0} public
            </Badge>
            {canReview ? (
              <Badge tone="teal">
                <ShieldCheck size={11} /> Review access
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="container-page py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-navy-900/12 bg-white p-0.5">
            <TabButton
              active={tab === "public"}
              onClick={() => setTab("public")}
              label="Public reports"
              icon={<ClipboardList size={13} />}
            />
            {user ? (
              <TabButton
                active={tab === "mine"}
                onClick={() => setTab("mine")}
                label="My reports"
                icon={<UserRound size={13} />}
              />
            ) : null}
            {canReview ? (
              <TabButton
                active={tab === "review"}
                onClick={() => setTab("review")}
                label="Review queue"
                icon={<ShieldCheck size={13} />}
              />
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Filter size={13} className="text-ink-400" />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | ComplaintStatus)
              }
              className="input !w-auto !py-2 !text-[12px]"
              aria-label="Filter complaints by status"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in-review">In review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {tab === "public" && !user ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-900/10 bg-white px-4 py-3">
            <p className="flex items-center gap-2 text-[11.5px] text-ink-500">
              <MessageSquarePlus size={15} className="text-teal-600" />
              Sign in to file a report. Reports are attributed to verified accounts.
            </p>
            <div className="flex gap-2">
              <Link
                to={`/login?next=${encodeURIComponent("/complaints")}`}
                className="btn btn-primary btn-sm"
              >
                Sign in
              </Link>
              <Link to="/register" className="btn btn-outline btn-sm">
                Create account
              </Link>
            </div>
          </div>
        ) : null}

        {tab === "review" ? (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-teal-500/25 bg-teal-50/70 px-4 py-3 text-[11.5px] leading-relaxed text-teal-800">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" />
            <p>
              This queue includes non-public reports.{" "}
              {user?.role === "official"
                ? "Officials can update complaints in their own state only; the server enforces this restriction."
                : "Administrators can update complaints in any state."}{" "}
              Status changes and response notes are written to the audit log.
            </p>
          </div>
        ) : null}

        {activeData.loading ? (
          <LoadingBlock rows={4} />
        ) : activeData.error ? (
          <ErrorState message={activeData.error} onRetry={activeData.refresh} />
        ) : complaints.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={20} />}
            title={
              tab === "mine"
                ? "You have not filed any reports yet"
                : tab === "review"
                  ? "No complaints are waiting in this view"
                  : "No public complaints in this view"
            }
            description={
              tab === "mine"
                ? "Open a project and use the Citizen complaints tab to report an observed issue."
                : tab === "review"
                  ? "There are no reports matching this status and location. Try changing the status filter or location."
                  : `No citizen reports have been filed for ${city ? cityName : "this view"} yet.`
            }
            action={
              tab === "mine" ? (
                <Link to="/projects" className="btn btn-outline btn-sm">
                  Find a project
                </Link>
              ) : statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Clear status filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {complaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                canReview={canReview}
                onUpdated={activeData.refresh}
              />
            ))}
          </ul>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="card p-4">
            <h2 className="font-display text-lg">What a complaint is</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              A signed-in citizen's observation about a public project. Samaj Darpan does
              not independently investigate reports and does not forward them to
              government departments automatically.
            </p>
          </section>
          <section className="card p-4">
            <h2 className="font-display text-lg">What an official response is</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              A status update and optional note recorded by an account with official or
              administrator access. It is attributed and auditable, but it is not a
              substitute for a formal government grievance response.
            </p>
          </section>
          <section className="card p-4">
            <h2 className="font-display text-lg">Resolution rate</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              Calculated only from reports filed on this platform, marked resolved by an
              authorised account. It is not an official government performance metric.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition",
        active ? "bg-navy-900 text-cream-50" : "text-ink-500 hover:text-navy-900",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}

function ComplaintCard({
  complaint,
  canReview,
  onUpdated,
}: {
  complaint: Complaint;
  canReview: boolean;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [note, setNote] = useState(complaint.resolutionNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const dirty =
    status !== complaint.status || note.trim() !== (complaint.resolutionNote ?? "");

  const update = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/complaints/${complaint.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          resolutionNote: note.trim() ? note.trim() : null,
        }),
      });
      toast.push("Complaint updated", {
        description: `Status set to ${STATUS_LABEL[status].toLowerCase()}.`,
        tone: "success",
      });
      onUpdated();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update this complaint.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[complaint.status]}>
              {complaint.status === "resolved" ? (
                <CheckCircle2 size={10} />
              ) : complaint.status === "open" ? (
                <Clock3 size={10} />
              ) : (
                <AlertCircle size={10} />
              )}
              {STATUS_LABEL[complaint.status]}
            </Badge>
            <Badge tone="neutral">{CATEGORY_LABEL[complaint.category]}</Badge>
            {!complaint.isPublic ? <Badge tone="amber">Non-public</Badge> : null}
          </div>
          <h2 className="mt-1.5 font-display text-[1.1rem] leading-snug text-navy-900">
            {complaint.title}
          </h2>
        </div>
        <Link
          to={`/projects/${complaint.projectId}?tab=complaints`}
          className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-bold text-teal-700 hover:text-teal-600"
        >
          Project record <ExternalLink size={10} />
        </Link>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-600">
        {complaint.description}
      </p>

      <p className="mt-2 text-[10px] text-ink-400">
        {complaint.authorName} · {formatDate(complaint.createdAt)} ({relativeDate(complaint.createdAt)}) ·{" "}
        {complaint.projectName}
      </p>

      {complaint.resolutionNote ? (
        <div className="mt-2 rounded-lg border border-teal-500/20 bg-teal-50/70 px-3 py-2 text-[11px] leading-relaxed text-teal-900">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-teal-700">
            Recorded response
          </p>
          <p className="mt-0.5">{complaint.resolutionNote}</p>
          <p className="mt-1 text-[9px] text-teal-700/70">
            Updated {formatDate(complaint.updatedAt)}
          </p>
        </div>
      ) : null}

      {canReview ? (
        <div className="mt-3 rounded-lg border border-navy-900/10 bg-cream-50 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
            Official response
          </p>
          {error ? (
            <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[10.5px] text-red-800">
              {error}
            </p>
          ) : null}
          <div className="mt-2 grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ComplaintStatus)}
              className="input !py-1.5 !text-[11.5px]"
              aria-label="Complaint status"
            >
              <option value="open">Open</option>
              <option value="in-review">In review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Public response note (optional)"
              className="input min-h-[38px] !py-1.5 !text-[11.5px]"
              aria-label="Response note"
            />
            <Button
              size="sm"
              onClick={update}
              loading={saving}
              disabled={!dirty}
            >
              Save update
            </Button>
          </div>
          <p className="mt-1.5 text-[9px] text-ink-400">
            Responses are public and permanently attributed in the audit log. Do not
            include personal data about third parties.
          </p>
        </div>
      ) : null}
    </li>
  );
}
