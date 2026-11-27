import { useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Landmark,
  Pencil,
  PlusCircle,
  Search,
  ShieldQuestion,
} from "lucide-react";
import type { JurisdictionHouse, Representative } from "@shared/types";
import { CITIES } from "@shared/cities";
import { formatDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
} from "@/components/ui";
import { useApiData } from "@/hooks/useApiData";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiFetch } from "@/services/api";

const STATES = [...new Set(CITIES.map((c) => c.state))].sort();

export default function AdminRepresentativesPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [verFilter, setVerFilter] = useState<"all" | "verified" | "unverified">("all");
  const [editing, setEditing] = useState<Representative | null>(null);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data, loading, error, refresh } = useApiData<{
    representatives: Representative[];
    total: number;
  }>("/representatives");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.representatives ?? []).filter((rep) => {
      if (verFilter !== "all" && rep.verification !== verFilter) return false;
      if (!needle) return true;
      return [rep.name, rep.constituency, rep.state, rep.party, rep.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data?.representatives, q, verFilter]);

  const toggleVerification = async (rep: Representative) => {
    setToggling(rep.id);
    const next = rep.verification === "verified" ? "unverified" : "verified";
    try {
      await apiFetch(`/admin/representatives/${rep.id}`, {
        method: "PATCH",
        body: JSON.stringify({ verification: next }),
      });
      toast.push(`Marked ${rep.name} as ${next}`, { tone: "success" });
      refresh();
    } catch (err) {
      toast.push("Update failed", {
        description: err instanceof ApiError ? err.message : "Could not update representative.",
        tone: "error",
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · accountability"
        title="Elected representatives"
        description="Maintain sourced officeholder records, verify current officeholding against official legislature portals, or add municipal/assembly representatives."
        actions={
          <Button
            variant="teal"
            size="sm"
            onClick={() => setCreating(true)}
            icon={<PlusCircle size={13} />}
          >
            Add representative
          </Button>
        }
      />

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, constituency, state, party…"
              className="input !py-2 !pl-8 !text-[12px]"
              aria-label="Search representatives"
            />
          </div>
          <select
            value={verFilter}
            onChange={(e) => setVerFilter(e.target.value as typeof verFilter)}
            className="input !w-auto !py-2 !text-[12px]"
            aria-label="Filter by verification"
          >
            <option value="all">All verification states</option>
            <option value="verified">Verified only</option>
            <option value="unverified">Not re-verified</option>
          </select>
          <p className="ml-auto text-[10.5px] text-ink-400">
            {filtered.length} of {data?.total ?? 0} records
          </p>
        </div>
      </section>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Landmark size={20} />}
          title="No representatives match"
          description="Try clearing the search or filter, or add a new representative record."
        />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[11.5px]">
              <thead className="bg-cream-50 text-[9px] uppercase tracking-[0.1em] text-ink-400">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Representative</th>
                  <th className="px-3 py-2.5 font-bold">Constituency & State</th>
                  <th className="px-3 py-2.5 font-bold">House / Party</th>
                  <th className="px-3 py-2.5 font-bold">Verification</th>
                  <th className="px-3 py-2.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {filtered.map((rep) => (
                  <tr key={rep.id} className="hover:bg-cream-50/60">
                    <td className="px-3 py-2.5">
                      <p className="font-bold text-navy-900">{rep.name}</p>
                      <p className="text-[9.5px] text-ink-400">{rep.position}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-ink-700">{rep.constituency}</p>
                      <p className="text-[9.5px] text-ink-400">{rep.state}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-ink-700">{rep.house.replace("-", " ")}</p>
                      <p className="text-[9.5px] text-ink-400">{rep.party ?? "Independent / Not listed"}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={rep.verification === "verified" ? "teal" : "amber"}>
                        {rep.verification === "verified" ? (
                          <BadgeCheck size={11} />
                        ) : (
                          <ShieldQuestion size={11} />
                        )}
                        {rep.verification === "verified" ? "Verified" : "Not re-verified"}
                      </Badge>
                      <p className="mt-0.5 text-[9px] text-ink-400">
                        Checked {formatDate(rep.lastVerifiedAt)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={toggling === rep.id}
                          onClick={() => toggleVerification(rep)}
                        >
                          {rep.verification === "verified" ? "Mark unverified" : "Mark verified"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(rep)}
                          icon={<Pencil size={12} />}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing || creating ? (
        <RepresentativeModal
          representative={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function RepresentativeModal({
  representative,
  onClose,
  onSaved,
}: {
  representative: Representative | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isCreate = representative === null;
  const [form, setForm] = useState({
    name: representative?.name ?? "",
    role: representative?.role ?? ("mp" as Representative["role"]),
    house: representative?.house ?? ("lok-sabha" as JurisdictionHouse),
    position: representative?.position ?? "Member of Parliament, Lok Sabha",
    constituency: representative?.constituency ?? "",
    state: representative?.state ?? "",
    city: representative?.citySlug ?? "",
    party: representative?.party ?? "",
    profileUrl: representative?.profileUrl ?? "",
    sourceOrganisation: representative?.sourceOrganisation ?? "Election Commission of India",
    sourceUrl: representative?.sourceUrl ?? "https://results.eci.gov.in/PcResultGenJune2024/index.htm",
    verification: representative?.verification ?? ("verified" as "verified" | "unverified"),
    note: representative?.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () =>
      form.state
        ? CITIES.filter((c) => c.state === form.state).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [form.state],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2 || form.constituency.trim().length < 2 || !form.state) {
      setError("Name, constituency, and state are required.");
      return;
    }
    if (!/^https?:\/\//i.test(form.sourceUrl.trim())) {
      setError("Provide a valid http:// or https:// source URL.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        house: form.house,
        position: form.position.trim(),
        constituency: form.constituency.trim(),
        state: form.state,
        city: form.city || null,
        party: form.party.trim() || null,
        profileUrl: form.profileUrl.trim() || null,
        sourceOrganisation: form.sourceOrganisation.trim(),
        sourceUrl: form.sourceUrl.trim(),
        verification: form.verification,
        note: form.note.trim() || null,
      };
      if (isCreate) {
        await apiFetch("/admin/representatives", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.push("Representative added", { tone: "success" });
      } else {
        await apiFetch(`/admin/representatives/${representative.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.push("Representative updated", { tone: "success" });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save representative.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isCreate ? "Add representative" : `Edit ${representative.name}`}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>
            {isCreate ? "Add representative" : "Save changes"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="rep-name">Full name *</label>
            <input
              id="rep-name"
              className="input !py-1.5 !text-[12px]"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-party">Party</label>
            <input
              id="rep-party"
              className="input !py-1.5 !text-[12px]"
              value={form.party}
              onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-role">Role</label>
            <select
              id="rep-role"
              className="input !py-1.5 !text-[12px]"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Representative["role"] }))}
            >
              <option value="mp">Member of Parliament</option>
              <option value="mla">MLA</option>
              <option value="mayor">Mayor</option>
              <option value="councillor">Municipal Councillor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-house">House / Body</label>
            <select
              id="rep-house"
              className="input !py-1.5 !text-[12px]"
              value={form.house}
              onChange={(e) => setForm((f) => ({ ...f, house: e.target.value as JurisdictionHouse }))}
            >
              <option value="lok-sabha">Lok Sabha</option>
              <option value="vidhan-sabha">Vidhan Sabha</option>
              <option value="municipal">Municipal body</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-position">Position *</label>
            <input
              id="rep-position"
              className="input !py-1.5 !text-[12px]"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-constituency">Constituency *</label>
            <input
              id="rep-constituency"
              className="input !py-1.5 !text-[12px]"
              value={form.constituency}
              onChange={(e) => setForm((f) => ({ ...f, constituency: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-state">State *</label>
            <select
              id="rep-state"
              className="input !py-1.5 !text-[12px]"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, city: "" }))}
            >
              <option value="">Select state</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-city">City (optional)</label>
            <select
              id="rep-city"
              className="input !py-1.5 !text-[12px]"
              value={form.city}
              disabled={!form.state}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">State-wide / unspecified</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rep-src-org">Source organisation *</label>
            <input
              id="rep-src-org"
              className="input !py-1.5 !text-[12px]"
              value={form.sourceOrganisation}
              onChange={(e) => setForm((f) => ({ ...f, sourceOrganisation: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-src-url">Source URL *</label>
            <input
              id="rep-src-url"
              className="input !py-1.5 !text-[12px]"
              value={form.sourceUrl}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-profile">Official profile URL</label>
            <input
              id="rep-profile"
              className="input !py-1.5 !text-[12px]"
              value={form.profileUrl}
              onChange={(e) => setForm((f) => ({ ...f, profileUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="rep-ver">Verification</label>
            <select
              id="rep-ver"
              className="input !py-1.5 !text-[12px]"
              value={form.verification}
              onChange={(e) => setForm((f) => ({ ...f, verification: e.target.value as "verified" | "unverified" }))}
            >
              <option value="unverified">Not re-verified</option>
              <option value="verified">Source verified</option>
            </select>
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="rep-note">Note</label>
          <textarea
            id="rep-note"
            className="input min-h-[60px] !py-1.5 !text-[12px]"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
      </form>
    </Modal>
  );
}
