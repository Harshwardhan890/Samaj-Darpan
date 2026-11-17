import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  ChevronDown,
  ClipboardList,
  Database,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  Building2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCity } from "@/context/CityContext";
import { useToast } from "@/context/ToastContext";
import { cn, Badge, Logo } from "@/components/ui";
import { ROLE_LABELS, initials } from "@shared/format";
import { LocationSelector } from "./LocationSelector";

const NAV_LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FileSearch },
  { to: "/map", label: "Map", icon: Map },
  { to: "/representatives", label: "Accountability", icon: Users },
  { to: "/contractors", label: "Contractors", icon: Building2 },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function AppShell() {
  const { user, loading, logout } = useAuth();
  const { cityName } = useCity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!userRef.current?.contains(event.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userOpen]);

  const handleLogout = async () => {
    await logout();
    toast.push("Signed out", { tone: "info" });
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-navy-900/10 bg-cream-50/95 backdrop-blur-md">
        <div className="container-page">
          <div className="flex h-[66px] items-center justify-between gap-3">
            <Logo />
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <LocationSelector />
              </div>
              <div className="sm:hidden">
                <LocationSelector />
              </div>

              {loading ? (
                <div className="skeleton h-9 w-24 rounded-lg" />
              ) : user ? (
                <div className="relative" ref={userRef}>
                  <button
                    type="button"
                    onClick={() => setUserOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg border border-navy-900/10 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-teal-500/40"
                    aria-expanded={userOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-900 text-[10px] font-bold text-cream-50">
                      {initials(user.fullName)}
                    </span>
                    <span className="hidden max-w-[100px] truncate text-[12px] font-bold text-navy-900 md:block">
                      {user.fullName.split(" ")[0]}
                    </span>
                    <ChevronDown size={13} className="text-ink-400" />
                  </button>
                  {userOpen ? (
                    <div
                      role="menu"
                      className="animate-scale-in absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-navy-900/10 bg-white shadow-lift"
                    >
                      <div className="border-b hairline bg-cream-50 px-4 py-3">
                        <p className="truncate text-sm font-bold text-navy-900">
                          {user.fullName}
                        </p>
                        <p className="truncate text-[11px] text-ink-500">{user.email}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Badge tone={user.role === "admin" ? "gold" : user.role === "official" ? "teal" : "neutral"}>
                            {ROLE_LABELS[user.role]}
                          </Badge>
                          {user.isDemo ? <Badge tone="amber">Demo</Badge> : null}
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuLink to="/account" icon={<UserRound size={14} />} label="Your account" />
                        <MenuLink
                          to="/complaints"
                          icon={<ClipboardList size={14} />}
                          label="Your complaints"
                        />
                        {user.role === "admin" ? (
                          <MenuLink
                            to="/admin"
                            icon={<ShieldCheck size={14} />}
                            label="Admin console"
                          />
                        ) : null}
                        {user.role === "official" ? (
                          <MenuLink
                            to="/complaints?queue=official"
                            icon={<ClipboardList size={14} />}
                            label="Complaint review"
                          />
                        ) : null}
                      </div>
                      <div className="border-t hairline p-1.5">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          <LogOut size={14} /> Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="hidden items-center gap-1.5 sm:flex">
                  <Link to="/login" className="btn btn-ghost btn-sm">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    Create account
                  </Link>
                </div>
              )}

              <button
                type="button"
                className="rounded-lg border border-navy-900/10 bg-white p-2 text-navy-900 lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          <div className="hidden items-center justify-between border-t border-navy-900/[0.07] py-1.5 lg:flex">
            <nav className="flex items-center gap-0.5" aria-label="Primary">
              {NAV_LINKS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "relative rounded-md px-3 py-1.5 text-[12.5px] font-bold transition",
                      isActive
                        ? "text-navy-900"
                        : "text-ink-500 hover:bg-cream-100 hover:text-navy-900",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive ? (
                        <span className="absolute inset-x-3 -bottom-[7px] h-0.5 rounded-full bg-teal-500" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-[10.5px] font-semibold text-ink-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                Viewing <span className="text-navy-800">{cityName}</span>
              </span>
              <Link to="/sources" className="flex items-center gap-1 hover:text-navy-900">
                <Database size={11} /> Data sources
              </Link>
            </div>
          </div>
        </div>

        {mobileOpen ? (
          <div className="animate-fade border-t hairline bg-white lg:hidden">
            <nav className="container-page flex flex-col py-2" aria-label="Mobile">
              {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm font-semibold",
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-ink-700 hover:bg-cream-50",
                    )
                  }
                >
                  <Icon size={16} /> {label}
                </NavLink>
              ))}
              <Link
                to="/sources"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm font-semibold text-ink-700 hover:bg-cream-50"
              >
                <Database size={16} /> Data sources
              </Link>
              {!user ? (
                <div className="mt-2 flex gap-2 border-t hairline pt-3">
                  <Link to="/login" className="btn btn-outline flex-1">
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn-primary flex-1">
                    Create account
                  </Link>
                </div>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-ink-700 hover:bg-cream-100 hover:text-navy-900"
    >
      {icon} {label}
    </Link>
  );
}

function Footer() {
  const { selectCity } = useCity();
  return (
    <footer className="mt-16 border-t border-navy-900/10 bg-navy-950 text-cream-50">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo variant="light" />
            <p className="mt-5 max-w-md font-display text-[1.35rem] leading-snug text-cream-50/90">
              “Democracy does not end with voting. Citizens deserve transparency
              throughout the development process.”
            </p>
            <p className="mt-4 max-w-md text-[12px] leading-relaxed text-cream-50/45">
              Samaj Darpan is an independent civic infrastructure intelligence
              platform. It is not an official government website. Every record
              carries its source and verification state; absent information is
              shown as absent, not estimated.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cream-50/40">
              Platform
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-cream-50/70">
              <li><Link className="hover:text-teal-400" to="/" onClick={() => selectCity(null)}>National overview</Link></li>
              <li><Link className="hover:text-teal-400" to="/projects">All projects</Link></li>
              <li><Link className="hover:text-teal-400" to="/map">Map explorer</Link></li>
              <li><Link className="hover:text-teal-400" to="/representatives">Accountability</Link></li>
              <li><Link className="hover:text-teal-400" to="/complaints">Complaints</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cream-50/40">
              Data & methods
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-cream-50/70">
              <li><Link className="hover:text-teal-400" to="/sources">Sources & status</Link></li>
              <li><Link className="hover:text-teal-400" to="/methodology">Data methodology</Link></li>
              <li>
                <a className="inline-flex items-center gap-1 hover:text-teal-400" href="https://data.gov.in/" target="_blank" rel="noreferrer">
                  data.gov.in <ArrowUpRight size={11} />
                </a>
              </li>
              <li>
                <a className="inline-flex items-center gap-1 hover:text-teal-400" href="https://smartcities.data.gov.in/" target="_blank" rel="noreferrer">
                  Smart Cities data <ArrowUpRight size={11} />
                </a>
              </li>
              <li>
                <a className="inline-flex items-center gap-1 hover:text-teal-400" href="https://ipm.mospi.gov.in/Home/PublicDashboard" target="_blank" rel="noreferrer">
                  PAIMANA <ArrowUpRight size={11} />
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[10.5px] text-cream-50/35">
          <p>© {new Date().getFullYear()} Samaj Darpan. Civic transparency, built in the open.</p>
          <p>
            Photography: Wikimedia Commons (CC0) · Maps: OpenStreetMap contributors
          </p>
        </div>
      </div>
    </footer>
  );
}
