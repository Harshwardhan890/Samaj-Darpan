import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Box,
  Building2,
  Droplets,
  HeartPulse,
  Home,
  MapPin,
  Plane,
  Route,
  School,
  TrainFront,
  Trees,
  Trash2,
  Waves,
  Zap,
  Landmark,
} from "lucide-react";
import type { Project, ProjectCategory } from "@shared/types";
import {
  CATEGORY_LABELS,
  formatINRCompact,
  formatPercent,
} from "@shared/format";
import { cn, DataClassBadge, SourceLine, StatusBadge, Unavailable } from "@/components/ui";

export function CategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: ProjectCategory;
  size?: number;
  className?: string;
}) {
  const map = {
    roads: Route,
    bridges: Waves,
    metro: TrainFront,
    rail: TrainFront,
    airports: Plane,
    water: Droplets,
    sanitation: Trash2,
    housing: Home,
    health: HeartPulse,
    education: School,
    energy: Zap,
    parks: Trees,
    "public-buildings": Landmark,
    other: Box,
  } as const;
  const Icon = map[category] ?? Building2;
  return <Icon size={size} className={className} />;
}

export function ProjectCard({ project }: { project: Project }) {
  const isDemo = project.dataClass === "demonstration";
  const cost = project.revisedBudget ?? project.approvedBudget;
  const progress = project.physicalProgress;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-xl border bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        isDemo
          ? "border-gold-500/30 bg-[linear-gradient(180deg,rgba(246,237,210,0.35),rgba(255,255,255,0)_45%)]"
          : "border-navy-900/10 hover:border-teal-500/35",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-md bg-cream-100 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-600">
          <CategoryIcon category={project.category} size={12} />
          {CATEGORY_LABELS[project.category]}
        </span>
        <StatusBadge status={project.status} />
      </div>

      <Link to={`/projects/${project.id}`} className="mt-3 block">
        <h3 className="line-clamp-2 font-display text-[1.05rem] leading-snug text-navy-900 transition group-hover:text-teal-700">
          {project.name}
        </h3>
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-ink-500">
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          {project.city ?? project.district ?? project.state ?? "Location unavailable"}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono text-[9.5px] text-ink-400">{project.id}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <DataClassBadge dataClass={project.dataClass} />
        {project.verificationStatus === "verified" ||
        project.verificationStatus === "published" ? (
          <span className="badge border border-teal-500/25 bg-teal-50 text-teal-700">
            Verified record
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t hairline pt-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
            Approved cost
          </p>
          {cost === null ? (
            <p className="mt-0.5 text-[10px] italic text-ink-400">Not published</p>
          ) : (
            <p className="mt-0.5 text-[13px] font-bold text-navy-900">
              {formatINRCompact(cost)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
            Physical progress
          </p>
          {progress === null ? (
            <p className="mt-0.5 text-[10px] italic text-ink-400">Not published</p>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-navy-900">
                {formatPercent(progress)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <SourceLine
          organisation={project.sourceOrganisation}
          url={project.sourceUrl}
          retrievedAt={project.retrievedAt}
          className="line-clamp-1"
        />
      </div>

      <Link
        to={`/projects/${project.id}`}
        className="absolute right-3 top-3 hidden rounded-md p-1 text-ink-400 transition group-hover:block hover:bg-cream-100 hover:text-navy-900"
        aria-label={`Open ${project.name}`}
      >
        <ArrowUpRight size={14} />
      </Link>
    </article>
  );
}

export function ProjectRow({ project }: { project: Project }) {
  const cost = project.revisedBudget ?? project.approvedBudget;
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex items-center gap-3 border-b hairline py-3 last:border-0 hover:bg-cream-50/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-100 text-ink-600">
        <CategoryIcon category={project.category} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold text-navy-900 group-hover:text-teal-700">
          {project.name}
        </p>
        <p className="truncate text-[10px] text-ink-400">
          {project.city ?? project.state} · {CATEGORY_LABELS[project.category]}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        {cost === null ? (
          <span className="text-[9.5px] italic text-ink-400">Cost not published</span>
        ) : (
          <span className="text-[11.5px] font-bold text-navy-900">{formatINRCompact(cost)}</span>
        )}
        <div className="mt-0.5 flex justify-end">
          <StatusBadge status={project.status} />
        </div>
      </div>
      <ArrowUpRight size={14} className="shrink-0 text-ink-300 group-hover:text-teal-600" />
    </Link>
  );
}

export function ProjectMini({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-start gap-2 rounded-lg border border-navy-900/8 p-2.5 transition hover:border-teal-500/30 hover:bg-cream-50"
    >
      <span className="mt-0.5 text-teal-600">
        <CategoryIcon category={project.category} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[11px] font-bold text-navy-900">{project.name}</span>
        <span className="mt-0.5 block text-[9.5px] text-ink-400">
          {project.city ?? project.state}
        </span>
      </span>
    </Link>
  );
}

export function ProjectFinancial({ project }: { project: Project }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <p className="eyebrow">Approved cost</p>
        {project.approvedBudget === null ? (
          <Unavailable />
        ) : (
          <p className="mt-1 font-display text-xl">{formatINRCompact(project.approvedBudget)}</p>
        )}
      </div>
      <div>
        <p className="eyebrow">Documented expenditure</p>
        {project.expenditure === null ? (
          <Unavailable />
        ) : (
          <p className="mt-1 font-display text-xl">{formatINRCompact(project.expenditure)}</p>
        )}
      </div>
      <div>
        <p className="eyebrow">Physical progress</p>
        {project.physicalProgress === null ? (
          <Unavailable />
        ) : (
          <p className="mt-1 font-display text-xl">{formatPercent(project.physicalProgress)}</p>
        )}
      </div>
    </div>
  );
}
