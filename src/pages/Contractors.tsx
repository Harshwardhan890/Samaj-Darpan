import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  HardHat,
  Search,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type { ProjectStatus } from "@shared/types";
import { STATUS_LABELS } from "@shared/format";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useCity } from "@/context/CityContext";
import { useApiData } from "@/hooks/useApiData";
import { qs } from "@/services/api";

interface ContractorEntry {
  name: string;
  projectCount: number;
  verified: boolean;
  sources: string[];
  projects: {
    id: string;
    name: string;
    city: string | null;
    status: ProjectStatus;
  }[];
}

interface ContractorsResponse {
  contractors: ContractorEntry[];
  note: string;
}

export default function ContractorsPage() {
  const { city, cityName } = useCity();
  const [q, setQ] = useState("");

  const { data, loading, error, refresh } = useApiData<ContractorsResponse>(
    `/contractors${qs({ state: city?.stateSlug, city: city?.slug })}`,
    [city?.slug],
  );

  const contractors = (data?.contractors ?? []).filter((contractor) =>
    q.trim()
      ? contractor.name.toLowerCase().includes(q.trim().toLowerCase())
      : true,
  );

  return (
    <div>
      <PageHeader
        eyebrow={city ? `${city.state} · ${city.name}` : "All India"}
        title="Contractor records"
        description="Organisations named in a cited public project record. Inclusion is not a finding of wrongdoing, and absence is not evidence that no contractor exists."
        actions={
          <Badge tone="navy">
            <HardHat size={11} /> {data?.contractors.length ?? 0} named
          </Badge>
        }
      />

      <div className="container-page py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search contractor name…"
              className="input !py-2.5 !pl-9 !text-sm"
              aria-label="Search contractors"
            />
          </div>
          <p className="text-[11px] text-ink-500">
            {contractors.length} record{contractors.length === 1 ? "" : "s"} for{" "}
            {city ? cityName : "India"}
          </p>
        </div>

        {loading ? (
          <LoadingBlock rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : contractors.length === 0 ? (
          <EmptyState
            icon={<HardHat size={20} />}
            title="No contractor names published in this view"
            description="Most cited summary records do not name a contractor. Contractor appointments are often published only in award documents, which are not always machine-readable. Samaj Darpan does not guess names."
            action={
              <Link to="/projects" className="btn btn-outline btn-sm">
                Browse project records
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contractors.map((contractor) => (
              <article key={contractor.name} className="card flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cream-100 text-ink-600">
                    <Building2 size={17} />
                  </span>
                  <Badge tone={contractor.verified ? "teal" : "amber"}>
                    {contractor.verified ? (
                      <ShieldCheck size={11} />
                    ) : (
                      <ShieldQuestion size={11} />
                    )}
                    {contractor.verified ? "Verified record" : "Unverified record"}
                  </Badge>
                </div>
                <h2 className="mt-3 font-display text-[1.1rem] leading-snug text-navy-900">
                  {contractor.name}
                </h2>
                <p className="mt-1 text-[10.5px] text-ink-400">
                  Named in {contractor.projectCount} public project record
                  {contractor.projectCount === 1 ? "" : "s"}
                </p>

                <ul className="mt-3 space-y-1.5 border-t hairline pt-3">
                  {contractor.projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        to={`/projects/${project.id}`}
                        className="group flex items-start gap-1.5 text-[11px] font-semibold text-ink-700 hover:text-teal-700"
                      >
                        <ArrowUpRight
                          size={11}
                          className="mt-0.5 shrink-0 text-ink-300 group-hover:text-teal-600"
                        />
                        <span className="min-w-0">
                          <span className="line-clamp-1">{project.name}</span>
                          <span className="block text-[9px] font-normal text-ink-400">
                            {project.city ?? "Location not published"} ·{" "}
                            {STATUS_LABELS[project.status]}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-3">
                  {contractor.sources.length > 0 ? (
                    <a
                      href={contractor.sources[0]}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-600"
                    >
                      Cited source <ArrowUpRight size={10} />
                    </a>
                  ) : (
                    <p className="text-[10px] italic text-ink-400">
                      No source URL attached.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-navy-900/10 bg-white p-4">
          <p className="text-[11.5px] leading-relaxed text-ink-500">
            <strong className="text-navy-900">What this list means.</strong>{" "}
            {data?.note ??
              "Contractor records appear only where a cited public source names a contractor."}{" "}
            A name appearing here is not an allegation of misconduct. Where a contract
            value, award date or completion certificate is missing, the platform shows it
            as unavailable rather than filling the gap.
          </p>
        </div>
      </div>
    </div>
  );
}
