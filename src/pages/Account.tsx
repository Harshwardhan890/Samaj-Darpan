import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Bookmark,
  Building2,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
  UserRound,
} from "lucide-react";
import type { AuditEntry, Project } from "@shared/types";
import { CITIES } from "@shared/cities";
import { ROLE_LABELS, STATUS_LABELS, formatDate, initials, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Tabs,
  cn,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { ApiError, apiFetch } from "@/services/api";

const STATES = [...new Set(CITIES.map((city) => city.state))].sort();

export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activity = useApiData<{ entries: AuditEntry[] }>(user ? "/audit/mine" : null, [
    user?.id,
  ]);
  const myComplaints = useApiData<{ complaints: unknown[]; total: number }>(
    user ? "/complaints/mine" : null,
    [user?.id],
  );
  const { toggle: toggleWatchlist } = useWatchlist();
  const savedProjects = useApiData<{ projects: Project[]; ids: string[] }>(
    user ? "/projects-followed" : null,
    [user?.id, user?.followedProjectIds?.length],
  );

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setState(user.state ?? "");
    setCity(user.city ?? "");
  }, [user]);

  const cityOptions = useMemo(
    () =>
      CITIES.filter((candidate) => candidate.state === state).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [state],
  );

  if (!user) return null;

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    if (fullName.trim().length < 2) {
      setProfileError("Enter your full name.");
      return;
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      setProfileError("Enter a 10-digit Indian mobile number, or leave it blank.");
      return;
    }
    if (!state || !city) {
      setProfileError("Select your state and city.");
      return;
    }
    const chosen = CITIES.find((candidate) => candidate.slug === city);
    if (!chosen) {
      setProfileError("Select a supported city from the list.");
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phone: phone ? phone : null,
        state: chosen.state,
        city: chosen.slug,
      });
      activity.refresh();
      toast.push("Profile updated", { tone: "success" });
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Could not update your profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 10) {
      setPasswordError("Use at least 10 characters.");
      return;
    }
    if (
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      setPasswordError("Include uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      activity.refresh();
      toast.push("Password changed", {
        description: "Use the new password next time you sign in.",
        tone: "success",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : "Could not change the password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const cityName =
    CITIES.find((candidate) => candidate.slug === user.city || candidate.id === user.city)
      ?.name ?? user.city;

  return (
    <div>
      <PageHeader
        eyebrow="Your account"
        title={user.fullName}
        description="Manage your identity, location and security. Role permissions are enforced by the server and cannot be self-assigned."
        actions={
          <>
            <Badge tone={user.role === "admin" ? "gold" : user.role === "official" ? "teal" : "neutral"}>
              {ROLE_LABELS[user.role]}
            </Badge>
            {user.isDemo ? <Badge tone="amber">Demo account</Badge> : null}
            {user.emailVerified ? (
              <Badge tone="green">
                <BadgeCheck size={11} /> Email verified
              </Badge>
            ) : (
              <Badge tone="amber">
                <ShieldQuestion size={11} /> Email unverified
              </Badge>
            )}
          </>
        }
      />

      <div className="container-page py-6">
        {user.isDemo ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-gold-500/40 bg-gold-100/60 px-4 py-3 text-[11.5px] leading-relaxed text-[#6b5412]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>
              This is a shared demonstration account. Changes to its profile or password
              affect anyone using the same demo role, and demo data may be reset by the
              operator. Do not enter real personal information.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <div className="card p-5 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 font-display text-xl text-cream-50">
                {initials(user.fullName)}
              </span>
              <p className="mt-3 font-display text-lg leading-tight">{user.fullName}</p>
              <p className="mt-0.5 break-all text-[11px] text-ink-400">{user.email}</p>
              <div className="mt-2 flex justify-center">
                <Badge tone={user.role === "admin" ? "gold" : user.role === "official" ? "teal" : "neutral"}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <dl className="mt-4 space-y-2 border-t hairline pt-3 text-left">
                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                  <dt className="flex items-center gap-1 text-ink-400">
                    <MapPin size={11} /> Location
                  </dt>
                  <dd className="font-semibold text-ink-700">
                    {cityName ?? "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                  <dt className="flex items-center gap-1 text-ink-400">
                    <ClipboardList size={11} /> Reports
                  </dt>
                  <dd className="font-semibold text-ink-700">
                    {myComplaints.data?.total ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10.5px]">
                  <dt className="flex items-center gap-1 text-ink-400">
                    <UserRound size={11} /> Member since
                  </dt>
                  <dd className="font-semibold text-ink-700">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Quick links
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <Link
                  to="/complaints?tab=mine"
                  className="rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-cream-50"
                >
                  My complaints
                </Link>
                <Link
                  to="/projects"
                  className="rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-cream-50"
                >
                  Browse projects
                </Link>
                <Link
                  to="/sources"
                  className="rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-ink-700 hover:bg-cream-50"
                >
                  Data sources
                </Link>
                {user.role === "admin" ? (
                  <Link
                    to="/admin"
                    className="rounded-md px-2 py-1.5 text-[11.5px] font-bold text-teal-700 hover:bg-teal-50"
                  >
                    Admin console
                  </Link>
                ) : null}
                {user.role === "official" ? (
                  <Link
                    to="/complaints?queue=official"
                    className="rounded-md px-2 py-1.5 text-[11.5px] font-bold text-teal-700 hover:bg-teal-50"
                  >
                    Complaint review queue
                  </Link>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "profile", label: "Profile", icon: <UserRound size={13} /> },
                {
                  id: "saved",
                  label: "Saved projects",
                  count: savedProjects.data?.projects.length ?? user.followedProjectIds?.length ?? 0,
                  icon: <Bookmark size={13} />,
                },
                { id: "security", label: "Security", icon: <LockKeyhole size={13} /> },
                { id: "activity", label: "Your activity", icon: <Activity size={13} /> },
              ]}
            />

            <div className="mt-5">
              {tab === "profile" ? (
                <form onSubmit={submitProfile} className="card p-5" noValidate>
                  <h2 className="font-display text-xl">Profile details</h2>
                  <p className="mt-1 text-[11px] text-ink-400">
                    Your name appears on public complaints you file. Your email address is
                    not shown on public pages.
                  </p>
                  {profileError ? (
                    <p
                      role="alert"
                      className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800"
                    >
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      {profileError}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fullName" className="field-label">Full name</label>
                      <input
                        id="fullName"
                        className="input"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="field-label">Email address</label>
                      <div className="relative">
                        <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <input
                          id="email"
                          className="input !pl-8"
                          value={user.email}
                          readOnly
                          disabled
                        />
                      </div>
                      <p className="mt-1 text-[9.5px] text-ink-400">
                        Email changes require verification and are handled by support.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="phone" className="field-label">Mobile number</label>
                      <div className="relative">
                        <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                        <span className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-ink-400">
                          +91
                        </span>
                        <input
                          id="phone"
                          className="input !pl-[4.2rem]"
                          value={phone}
                          onChange={(event) =>
                            setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          placeholder="Optional"
                          inputMode="numeric"
                          autoComplete="tel-national"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="state" className="field-label">State</label>
                      <select
                        id="state"
                        className="input"
                        value={state}
                        onChange={(event) => {
                          setState(event.target.value);
                          setCity("");
                        }}
                      >
                        <option value="">Select a state</option>
                        {STATES.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="city" className="field-label">City</label>
                      <select
                        id="city"
                        className="input"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        disabled={!state}
                      >
                        <option value="">{state ? "Select a city" : "Select a state first"}</option>
                        {cityOptions.map((option) => (
                          <option key={option.id} value={option.slug}>{option.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <Button type="submit" loading={profileSaving}>
                      Save changes
                    </Button>
                    <span className="text-[10px] text-ink-400">
                      Location is used for complaint routing and scoped views.
                    </span>
                  </div>
                </form>
              ) : tab === "saved" ? (
                <div className="card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-xl">Saved projects</h2>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Projects you follow across sessions.
                      </p>
                    </div>
                    <Badge tone="navy">{savedProjects.data?.projects.length ?? 0} saved</Badge>
                  </div>
                  {savedProjects.loading ? (
                    <LoadingBlock rows={2} className="mt-4" />
                  ) : (savedProjects.data?.projects.length ?? 0) === 0 ? (
                    <EmptyState
                      className="mt-4"
                      icon={<Bookmark size={19} />}
                      title="No saved projects yet"
                      description="Use the Save button on any project card or project detail page to track updates here."
                      action={
                        <Link to="/projects" className="btn btn-outline btn-sm">
                          Browse projects
                        </Link>
                      }
                    />
                  ) : (
                    <ul className="mt-4 divide-y divide-navy-900/8">
                      {savedProjects.data?.projects.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <Link
                              to={`/projects/${p.id}`}
                              className="block truncate text-[12.5px] font-bold text-navy-900 hover:text-teal-700"
                            >
                              {p.name}
                            </Link>
                            <p className="text-[10px] text-ink-400">
                              {p.city ?? p.state} · {STATUS_LABELS[p.status]} · Updated{" "}
                              {relativeDate(p.lastUpdated)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await toggleWatchlist(p.id);
                              savedProjects.refresh();
                            }}
                            aria-label={`Remove ${p.name}`}
                            icon={<Trash2 size={13} />}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : tab === "security" ? (
                <div className="space-y-4">
                  <form onSubmit={submitPassword} className="card p-5" noValidate>
                    <h2 className="font-display text-xl">Change password</h2>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Passwords are stored only as a scrypt hash. The server validates
                      length and complexity.
                    </p>
                    {passwordError ? (
                      <p
                        role="alert"
                        className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800"
                      >
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        {passwordError}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="currentPassword" className="field-label">
                          Current password
                        </label>
                        <div className="relative">
                          <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                          <input
                            id="currentPassword"
                            type="password"
                            className="input !pl-8"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            autoComplete="current-password"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="newPassword" className="field-label">New password</label>
                        <input
                          id="newPassword"
                          type="password"
                          className="input"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirmPassword" className="field-label">
                          Confirm new password
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          className="input"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="mt-4"
                      loading={passwordSaving}
                      icon={<ShieldCheck size={14} />}
                    >
                      Update password
                    </Button>
                  </form>

                  <div className="card p-5">
                    <h2 className="font-display text-xl">Account security</h2>
                    <ul className="mt-3 space-y-2 text-[11px]">
                      <SecurityRow
                        ok={user.emailVerified}
                        label="Email address verified"
                        detail={
                          user.emailVerified
                            ? "Your account can sign in and file complaints."
                            : "Verify your email before signing in."
                        }
                      />
                      <SecurityRow
                        ok={user.role !== "official" || user.officialVerified}
                        label="Official access verification"
                        detail={
                          user.role === "official"
                            ? user.officialVerified
                              ? "An administrator has verified this official account."
                              : "This official account has not yet been verified by an administrator."
                            : "Not applicable to citizen accounts."
                        }
                      />
                      <SecurityRow
                        ok
                        label="Server-side session"
                        detail="Sessions use an HTTP-only cookie and are invalidated on sign out."
                      />
                      <SecurityRow
                        ok
                        label="Role enforcement"
                        detail="Administrator and official permissions are checked on every API request."
                      />
                    </ul>
                  </div>

                  <div className="card p-5">
                    <h2 className="font-display text-xl">Roles and permissions</h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                      Your current role is <strong>{ROLE_LABELS[user.role]}</strong>.
                      Administrator access is provisioned by platform operators and can
                      never be self-assigned. Government-official accounts are reviewed by
                      an administrator before official permissions are enabled.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="teal"><CheckCircle2 size={10} /> Report issues</Badge>
                      <Badge tone={user.role !== "citizen" ? "teal" : "neutral"}>
                        <CheckCircle2 size={10} /> Review complaints
                      </Badge>
                      <Badge tone={user.role === "admin" ? "teal" : "neutral"}>
                        <CheckCircle2 size={10} /> Verify & import records
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl">Your audit trail</h2>
                        <p className="mt-1 text-[11px] text-ink-400">
                          Actions recorded against your account, newest first.
                        </p>
                      </div>
                      <Badge tone="neutral">{activity.data?.entries.length ?? 0}</Badge>
                    </div>
                    {activity.loading ? (
                      <LoadingBlock rows={2} className="mt-4" />
                    ) : (activity.data?.entries.length ?? 0) === 0 ? (
                      <EmptyState
                        className="mt-4"
                        icon={<Activity size={19} />}
                        title="No recorded activity yet"
                        description="Sign-ins, profile changes, verification actions and complaint updates appear here."
                      />
                    ) : (
                      <ul className="mt-4 divide-y divide-navy-900/8">
                        {activity.data?.entries.map((entry) => (
                          <li key={entry.id} className="flex items-start gap-3 py-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cream-100 text-ink-500">
                              {entry.entityType === "project" ? (
                                <Building2 size={13} />
                              ) : entry.entityType === "complaint" ? (
                                <ClipboardList size={13} />
                              ) : entry.entityType === "auth" ? (
                                <KeyRound size={13} />
                              ) : (
                                <Activity size={13} />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] font-semibold text-ink-700">
                                {entry.summary}
                              </p>
                              <p className="text-[9.5px] text-ink-400">
                                {entry.action} · {formatDate(entry.createdAt)} (
                                {relativeDate(entry.createdAt)})
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="card p-5">
                    <h2 className="font-display text-xl">My complaints</h2>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Reports you have filed, including non-public ones.
                    </p>
                    {myComplaints.loading ? (
                      <LoadingBlock rows={2} className="mt-4" />
                    ) : (myComplaints.data?.complaints.length ?? 0) === 0 ? (
                      <EmptyState
                        className="mt-4"
                        icon={<ClipboardList size={19} />}
                        title="No reports filed"
                        description="Open a project and use the Citizen complaints tab to file an observation."
                        action={
                          <Link to="/projects" className="btn btn-outline btn-sm">
                            Browse projects
                          </Link>
                        }
                      />
                    ) : (
                      <Link
                        to="/complaints?tab=mine"
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-teal-700"
                      >
                        Open my reports →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" />
      ) : (
        <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
      )}
      <div>
        <p className={cn("font-semibold", ok ? "text-ink-700" : "text-amber-800")}>
          {label}
        </p>
        <p className="text-[10px] leading-relaxed text-ink-400">{detail}</p>
      </div>
    </li>
  );
}
