import { NavLink, Outlet, Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Database,
  FileUp,
  Gauge,
  Landmark,
  Map,
  ScrollText,
  Users,
} from "lucide-react";
import { cn, Badge } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const ADMIN_LINKS = [
  { to: "/admin", label: "Overview", icon: Gauge, end: true },
  { to: "/admin/projects", label: "Projects & verification", icon: ClipboardCheck },
  { to: "/admin/import", label: "Import data", icon: FileUp },
  { to: "/admin/sources", label: "Data sources", icon: Database },
  { to: "/admin/representatives", label: "Representatives", icon: Landmark },
  { to: "/admin/users", label: "Users & roles", icon: Users },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/geo", label: "Constituency boundaries", icon: Map },
];

export function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="container-page py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Administrator console</p>
          <h1 className="mt-1 text-2xl">Data management & verification</h1>
          <p className="mt-1 text-[11.5px] text-ink-500">
            Signed in as {user?.fullName}. Every action here is written to the audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="gold">Administrator</Badge>
          <Link to="/" className="btn btn-outline btn-sm">
            <ArrowLeft size={13} /> Public site
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-[136px] lg:self-start">
          <nav
            className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-navy-900/10 bg-white p-1.5 lg:flex-col lg:overflow-visible"
            aria-label="Admin sections"
          >
            {ADMIN_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition",
                    isActive
                      ? "bg-navy-900 text-cream-50"
                      : "text-ink-600 hover:bg-cream-50 hover:text-navy-900",
                  )
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-50/60 p-3 text-[10px] leading-relaxed text-[#6b5412]">
            <p className="font-bold">Verification discipline</p>
            <p className="mt-1">
              Do not verify a record without opening the cited source. PUBLISH requires a
              source URL; the server enforces this.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
