import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardStats, ProjectCategory, ProjectStatus } from "@shared/types";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatINRCompact,
  formatPercent,
} from "@shared/format";
import { cn, EmptyState } from "@/components/ui";
import { BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";

const NAVY = "#0a2136";
const TEAL = "#149a97";
const GOLD = "#c9a227";
const SLATE = "#8b98a2";
const AMBER = "#d97706";
const RED = "#b42318";
const GREEN = "#15803d";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planned: SLATE,
  ongoing: TEAL,
  completed: GREEN,
  delayed: AMBER,
  stalled: RED,
  unknown: "#c9c3b4",
};

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <section className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-[1.05rem]">
            {icon}
            {title}
          </h3>
          {subtitle ? <p className="mt-1 text-[11px] text-ink-400">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid rgba(7,23,40,0.12)",
  boxShadow: "0 12px 32px -12px rgba(7,23,40,0.28)",
  fontSize: 12,
  fontFamily: "Manrope, sans-serif",
};

export function CategoryChart({ stats }: { stats: DashboardStats }) {
  const data = stats.byCategory.map((entry) => ({
    name: CATEGORY_LABELS[entry.category as ProjectCategory] ?? entry.category,
    short: (CATEGORY_LABELS[entry.category as ProjectCategory] ?? entry.category)
      .replace(" & ", " & ")
      .replace("Public ", ""),
    value: entry.count,
  }));
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={19} />}
        title="No categories in this view"
        description="Choose a different city or import sourced project records."
      />
    );
  }
  return (
    <div className="h-[270px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="rgba(7,23,40,0.08)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#7f8a94" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="short"
            width={124}
            tick={{ fontSize: 10.5, fill: "#35424e", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(20,154,151,0.06)" }}
            formatter={(value) => [`${Number(value)} projects`, "Count"]}
          />
          <Bar dataKey="value" fill={TEAL} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusDonut({ stats }: { stats: DashboardStats }) {
  const data = stats.byStatus.map((entry) => ({
    name: STATUS_LABELS[entry.status],
    value: entry.count,
    status: entry.status,
  }));
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<PieIcon size={19} />}
        title="No status data"
        description="Project status appears when records are imported or verified."
      />
    );
  }
  return (
    <div>
      <div className="relative h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value)} projects`, "Count"]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl leading-none text-navy-900">
            {stats.totalProjects}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-400">
            records
          </span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLORS[entry.status] }}
              />
              {entry.name}
            </span>
            <span className="text-[10.5px] font-bold text-navy-900">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetByYearChart({ stats }: { stats: DashboardStats }) {
  if (stats.budgetByYear.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={19} />}
        title="No dated approved costs yet"
        description="A time series is drawn only where a record publishes both a start year and an approved cost. Nothing is interpolated."
      />
    );
  }
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stats.budgetByYear} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(7,23,40,0.08)" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#7f8a94" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 9, fill: "#7f8a94" }}
            tickFormatter={(value) => formatINRCompact(Number(value)) ?? ""}
            width={64}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [formatINRCompact(Number(value)) ?? "—", "Approved cost"]}
          />
          <Bar dataKey="approved" fill={NAVY} radius={[4, 4, 0, 0]} barSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DepartmentBars({ stats }: { stats: DashboardStats }) {
  const max = Math.max(1, ...stats.byDepartment.map((d) => d.count));
  if (stats.byDepartment.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-ink-400">
        No implementing departments recorded in this view.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {stats.byDepartment.map((department) => (
        <li key={department.department}>
          <div className="flex items-start justify-between gap-3">
            <span className="text-[11.5px] font-semibold leading-snug text-ink-700">
              {department.department}
            </span>
            <span className="text-[11px] font-bold text-navy-900">{department.count}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-teal-500"
              style={{ width: `${(department.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BudgetComparison({ stats }: { stats: DashboardStats }) {
  const rows = stats.financialProjects;
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No comparable financial records"
        description="Budget-versus-expenditure is shown only when a verified record publishes both figures."
      />
    );
  }
  return (
    <ul className="space-y-4">
      {rows.map((row) => {
        const max = Math.max(row.approvedBudget ?? 0, row.expenditure ?? 0) || 1;
        const approved = row.approvedBudget ?? 0;
        const spent = row.expenditure ?? 0;
        return (
          <li key={row.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-1 text-[11.5px] font-semibold text-ink-700">
                {row.name}
              </p>
              <p className="shrink-0 text-[10px] font-bold text-ink-400">
                {formatINRCompact(approved) ?? "—"}
              </p>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-navy-800" style={{ width: `${(approved / max) * 100}%` }} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${(spent / max) * 100}%` }} />
              </div>
            </div>
            <p className="mt-1 text-[9.5px] font-semibold text-ink-400">
              Expenditure documented: {row.expenditure === null ? "Information not publicly available." : formatINRCompact(spent)}
            </p>
          </li>
        );
      })}
      <li className="flex gap-4 border-t hairline pt-3 text-[9.5px] font-semibold text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-navy-800" /> Approved cost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" /> Documented expenditure
        </span>
      </li>
    </ul>
  );
}

export function ResolutionGauge({ stats }: { stats: DashboardStats }) {
  const rate = stats.complaintResolutionRate;
  const pctValue = rate ?? 0;
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${TEAL} ${pctValue * 3.6}deg, #ece7da 0deg)`,
        }}
      >
        <div className="flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full bg-white">
          <span className="font-display text-xl leading-none text-navy-900">
            {rate === null ? "—" : formatPercent(rate)}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-ink-400">
            resolved
          </span>
        </div>
      </div>
      <div className="space-y-2 text-[11.5px]">
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-500">Complaints filed</span>
          <span className="font-bold text-navy-900">{stats.complaints}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-500">Resolved</span>
          <span className="font-bold text-teal-700">{stats.resolvedComplaints}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-ink-500">Open / in review</span>
          <span className="font-bold text-amber-700">
            {stats.complaints - stats.resolvedComplaints}
          </span>
        </div>
        <p className="max-w-[170px] pt-1 text-[9.5px] leading-relaxed text-ink-400">
          {rate === null
            ? "No complaints have been filed in this view yet."
            : "Resolution rate is calculated from public complaints filed on this platform; it is not an official government metric."}
        </p>
      </div>
    </div>
  );
}

export function ProvenanceStrip({ stats }: { stats: DashboardStats }) {
  const colors: Record<string, string> = {
    official: TEAL,
    "admin-verified": GREEN,
    imported: NAVY,
    "user-submitted": "#7c3aed",
    demonstration: GOLD,
  };
  const labels: Record<string, string> = {
    official: "Official",
    "admin-verified": "Admin verified",
    imported: "Public record",
    "user-submitted": "Citizen",
    demonstration: "Demo",
  };
  const total = stats.byProvenance.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-cream-200">
        {stats.byProvenance.map((item) => (
          <span
            key={item.dataClass}
            style={{
              width: `${(item.count / total) * 100}%`,
              background: colors[item.dataClass],
            }}
            title={`${labels[item.dataClass]}: ${item.count}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {stats.byProvenance.map((item) => (
          <span
            key={item.dataClass}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: colors[item.dataClass] }}
            />
            {labels[item.dataClass]} · {item.count}
          </span>
        ))}
      </div>
    </div>
  );
}
