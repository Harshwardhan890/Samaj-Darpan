import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  MapPin,
  ShieldQuestion,
  UserRound,
} from "lucide-react";
import type { Representative } from "@shared/types";
import { formatDate, initials } from "@shared/format";
import { Badge } from "@/components/ui";

const roleLabel: Record<Representative["role"], string> = {
  mp: "Member of Parliament",
  mla: "Member of Legislative Assembly",
  mayor: "Mayor",
  councillor: "Municipal Councillor",
  other: "Elected representative",
};

export function RepresentativeCard({
  representative,
  compact = false,
}: {
  representative: Representative;
  compact?: boolean;
}) {
  const verified = representative.verification === "verified";
  return (
    <article className="card flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {representative.photoUrl ? (
            <img
              src={representative.photoUrl}
              alt={`${representative.name}, ${representative.position}`}
              className="h-12 w-12 rounded-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 font-display text-base text-cream-50">
              {initials(representative.name)}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-cream-100 text-ink-500">
            <UserRound size={8} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-teal-600">
            {roleLabel[representative.role]}
          </p>
          <h3 className="mt-0.5 font-display text-[1.05rem] leading-tight text-navy-900">
            {representative.name}
          </h3>
          <p className="mt-0.5 text-[10.5px] font-semibold text-ink-500">
            {representative.party ?? "Party affiliation not published"}
          </p>
        </div>
      </div>

      <dl className="mt-3.5 space-y-2 border-t hairline pt-3 text-[11px]">
        <div className="flex items-start gap-2">
          <MapPin size={12} className="mt-0.5 shrink-0 text-ink-400" />
          <div>
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
              Constituency
            </dt>
            <dd className="font-semibold text-ink-700">{representative.constituency}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays size={12} className="mt-0.5 shrink-0 text-ink-400" />
          <div>
            <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-400">
              Term
            </dt>
            <dd className="font-semibold text-ink-700">
              {representative.termStart
                ? `${new Date(representative.termStart).getFullYear()}–${representative.termEnd ? new Date(representative.termEnd).getFullYear() : "present"}`
                : "Term information unavailable"}
            </dd>
          </div>
        </div>
      </dl>

      {!compact ? (
        <div className="mt-3 rounded-lg bg-cream-50 px-2.5 py-2 text-[10px] leading-relaxed text-ink-500">
          <span className="font-bold text-ink-600">Source:</span>{" "}
          {representative.sourceOrganisation}. Last recorded{" "}
          {formatDate(representative.lastVerifiedAt)}.
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <Badge tone={verified ? "teal" : "amber"}>
          {verified ? <BadgeCheck size={11} /> : <ShieldQuestion size={11} />}
          {verified ? "Source verified" : "Not re-verified"}
        </Badge>
        {representative.profileUrl ? (
          <a
            href={representative.profileUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-600"
          >
            Official profile <ArrowUpRight size={10} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function RepresentativeAvatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-cream-50">
      {initials(name)}
    </span>
  );
}
