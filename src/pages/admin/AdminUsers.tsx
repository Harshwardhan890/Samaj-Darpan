import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { UserRole } from "@shared/types";
import { ROLE_LABELS, formatDate, relativeDate } from "@shared/format";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { ApiError, apiFetch } from "@/services/api";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  state: string | null;
  city: string | null;
  emailVerified: boolean;
  officialVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  authProvider: "local" | "supabase";
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, loading, error: loadError, refresh } = useApiData<{ users: AdminUser[] }>(
    "/admin/users",
  );

  const users = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.users ?? []).filter((user) =>
      needle
        ? [user.fullName, user.email, user.role, user.state, user.city]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)
        : true,
    );
  }, [data?.users, q]);

  const patch = async (user: AdminUser, body: Record<string, unknown>) => {
    setPending(user.id);
    setError(null);
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.push("Account updated", {
        description: `${user.fullName} was updated.`,
        tone: "success",
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the account.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · access control"
        title="Users & roles"
        description="Review accounts, enable official access and correct verification states. Administrator access can only be granted here, never through public registration."
        actions={<Badge tone="navy"><Users size={11} /> {data?.users.length ?? 0} accounts</Badge>}
      />

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search name, email, role or state…"
              className="input !py-2 !pl-8 !text-[12px]"
              aria-label="Search accounts"
            />
          </div>
          <p className="ml-auto text-[10.5px] text-ink-400">
            {users.length} shown
          </p>
        </div>

        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
          </p>
        ) : null}
      </section>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={refresh} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No accounts match"
          description="Try a different search term."
        />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-[11.5px]">
              <thead className="bg-cream-50 text-[9px] uppercase tracking-[0.1em] text-ink-400">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Account</th>
                  <th className="px-3 py-2.5 font-bold">Location</th>
                  <th className="px-3 py-2.5 font-bold">Role</th>
                  <th className="px-3 py-2.5 font-bold">Email verified</th>
                  <th className="px-3 py-2.5 font-bold">Official verified</th>
                  <th className="px-3 py-2.5 font-bold">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-cream-50/60">
                    <td className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 font-bold text-navy-900">
                        {user.fullName}
                        {me?.id === user.id ? <Badge tone="teal">You</Badge> : null}
                      </p>
                      <p className="break-all text-[9.5px] text-ink-400">{user.email}</p>
                      <p className="text-[9px] text-ink-300">
                        {user.authProvider} · joined {formatDate(user.createdAt)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-ink-600">
                      {[user.city, user.state].filter(Boolean).join(", ") || "Not set"}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={user.role}
                        disabled={pending === user.id}
                        onChange={(event) =>
                          patch(user, { role: event.target.value as UserRole })
                        }
                        className="input !w-auto !py-1 !text-[11px]"
                        aria-label={`Role for ${user.fullName}`}
                      >
                        <option value="citizen">Citizen</option>
                        <option value="official">Official</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <p className="mt-0.5 text-[9px] text-ink-400">
                        {ROLE_LABELS[user.role]}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <label className="flex cursor-pointer items-center gap-1.5 text-[10px]">
                        <input
                          type="checkbox"
                          checked={user.emailVerified}
                          disabled={pending === user.id}
                          onChange={(event) =>
                            patch(user, { emailVerified: event.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-teal-600"
                        />
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </label>
                    </td>
                    <td className="px-3 py-2.5">
                      {user.role === "official" || user.officialVerified ? (
                        <label className="flex cursor-pointer items-center gap-1.5 text-[10px]">
                          <input
                            type="checkbox"
                            checked={user.officialVerified}
                            disabled={pending === user.id}
                            onChange={(event) =>
                              patch(user, { officialVerified: event.target.checked })
                            }
                            className="h-3.5 w-3.5 accent-teal-600"
                          />
                          {user.officialVerified ? "Verified" : "Pending"}
                        </label>
                      ) : (
                        <span className="text-[10px] text-ink-400">Not applicable</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-ink-400">
                      {user.lastLoginAt
                        ? `${relativeDate(user.lastLoginAt)}`
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Note
          icon={<ShieldCheck size={15} />}
          title="Server-enforced roles"
          body="The API checks the authenticated account on every privileged request. Changing a select here does not grant client-side-only permissions."
        />
        <Note
          icon={<UserCog size={15} />}
          title="Official activation"
          body="An official account should be activated only after the person's government role has been checked independently."
        />
        <Note
          icon={<CheckCircle2 size={15} />}
          title="Audit trail"
          body="Every role and verification change is written to the audit log with your account and timestamp."
        />
      </div>
    </div>
  );
}

function Note({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-700">
        {icon}
      </span>
      <p className="mt-2 text-[11.5px] font-bold text-navy-900">{title}</p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}
