import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Landmark,
  Search,
  ShieldQuestion,
  Users,
} from "lucide-react";
import type { Representative } from "@shared/types";
import { formatDate } from "@shared/format";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  cn,
} from "@/components/ui";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { useApiData } from "@/hooks/useApiData";
import { qs } from "@/services/api";

const ROLE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All roles" },
  { id: "mp", label: "Members of Parliament" },
  { id: "mla", label: "MLAs" },
  { id: "mayor", label: "Mayors" },
  { id: "councillor", label: "Councillors" },
];

export default function RepresentativesPage() {
  const { user } = useAuth();
  const { city, cityName } = useCity();
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");

  const { data, loading, error, refresh } = useApiData<{
    representatives: Representative[];
    total: number;
  }>(
    `/representatives${qs({
      state: city?.stateSlug,
      city: city?.slug,
    })}`,
    [city?.slug],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.representatives ?? []).filter((rep) => {
      if (role !== "all" && rep.role !== role) return false;
      if (!needle) return true;
      return [rep.name, rep.constituency, rep.party, rep.position, rep.state]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data?.representatives, role, q]);

  const verified = (data?.representatives ?? []).filter(
    (rep) => rep.verification === "verified",
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={city ? `${city.state} · ${city.name}` : "All India"}
        title="Political accountability"
        description="Elected representatives, their recorded constituencies and the public source behind each record. Representation is not the same as responsibility for a project."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="navy">{data?.total ?? 0} records</Badge>
            <Badge tone="teal">{verified} sourced</Badge>
            {user?.role === "admin" ? (
              <Link to="/admin/representatives" className="btn btn-outline btn-sm">
                Manage in admin
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="container-page py-6">
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-50/70 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[11.5px] leading-relaxed text-[#6b5412]">
            <p className="font-bold">
              Samaj Darpan does not infer project responsibility from geography.
            </p>
            <p className="mt-0.5">
              An MP or MLA represents an area, but that does not mean they sanctioned,
              funded or executed a particular project. Project-specific links appear only
              after an administrator verifies them against a public source. Representative
              records show the date they were last checked and are not live officeholder
              feeds.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search name, constituency or party…"
              className="input !py-2.5 !pl-9 !text-sm"
              aria-label="Search representatives"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setRole(filter.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition",
                  role === filter.id
                    ? "border-navy-900 bg-navy-900 text-cream-50"
                    : "border-navy-900/12 bg-white text-ink-500 hover:border-teal-500/35 hover:text-navy-900",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-[11px] text-ink-500">
          Showing {filtered.length} of {data?.total ?? 0} representative records for{" "}
          {city ? cityName : "India"}.
        </p>

        {loading ? (
          <LoadingBlock rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            title="No representative records in this view"
            description={
              city
                ? `No sourced representative record is currently mapped to ${cityName}. The platform does not guess current officeholders.`
                : "No representative records match this filter. Try a broader search."
            }
            action={
              <Link to="/methodology" className="btn btn-outline btn-sm">
                How representation is recorded
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((representative) => (
              <RepresentativeCard
                key={representative.id}
                representative={representative}
              />
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section className="card p-4">
            <Landmark size={17} className="text-teal-600" />
            <h2 className="mt-2 font-display text-lg">Two houses, different areas</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              Lok Sabha and Vidhan Sabha constituencies are different geographies. A
              project can sit inside one and outside another. Samaj Darpan labels the
              house for each representative rather than blending them together.
            </p>
          </section>
          <section className="card p-4">
            <ShieldQuestion size={17} className="text-amber-600" />
            <h2 className="mt-2 font-display text-lg">Verification state</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              A record marked “Not re-verified” was transcribed from a cited public
              result but has not been checked against a live official source recently.
              Treat it as historical, not as a statement about who holds office today.
            </p>
          </section>
          <section className="card p-4">
            <Building2 size={17} className="text-navy-800" />
            <h2 className="mt-2 font-display text-lg">Corrections</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
              If a record is wrong, an administrator can correct it with a public source.
              Corrections are written to the audit log. Citizen accounts cannot edit
              representative records.
            </p>
            <Link
              to="/sources"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700"
            >
              Source status <ArrowUpRight size={10} />
            </Link>
          </section>
        </div>

        <p className="mt-5 text-[10px] text-ink-400">
          Representative data is transcribed from Election Commission of India result
          records and official legislature profiles where available. Last record update:{" "}
          {data?.representatives[0]
            ? formatDate(data.representatives[0].lastVerifiedAt)
            : "no records"}
          . Current officeholding is not guaranteed.
        </p>
      </div>
    </div>
  );
}
