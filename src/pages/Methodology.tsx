import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSearch,
  GitBranch,
  Landmark,
  MapPin,
  ShieldCheck,
  ShieldQuestion,
  Users,
} from "lucide-react";
import {
  Badge,
  PageHeader,
} from "@/components/ui";
import {
  DATA_CLASS_DESCRIPTIONS,
  DATA_CLASS_LABELS,
} from "@shared/format";
import type { DataClass } from "@shared/types";

const DATA_CLASSES: DataClass[] = [
  "official",
  "imported",
  "admin-verified",
  "user-submitted",
  "demonstration",
];

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Data & methods"
        title="How Samaj Darpan works"
        description="The rules that govern what appears on this platform, what is explicitly withheld, and how political accountability is handled without guesswork."
        actions={<Badge tone="teal"><ShieldCheck size={11} /> Public methodology</Badge>}
      />

      <div className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <article className="space-y-6">
            <section id="principles" className="card p-6 scroll-mt-36">
              <p className="eyebrow">The founding rule</p>
              <h2 className="mt-1 text-2xl">Show what is known. Show what is not.</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-600">
                Every record in Samaj Darpan is either sourced, explicitly labelled as
                demonstration data, or shown as unavailable. The platform does not
                interpolate missing financial figures, invent contractor names, assign
                political responsibility from geography, or place a map marker at a guessed
                location.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Principle
                  icon={<Database size={16} />}
                  title="Provenance on every record"
                  body="Each record carries a source organisation, a source URL where one exists, a retrieval date and a verification state."
                />
                <Principle
                  icon={<ShieldQuestion size={16} />}
                  title="Uncertainty is visible"
                  body="Unknown fields read “Information not publicly available.” They are not rendered as zero or as another project's value."
                />
                <Principle
                  icon={<MapPin size={16} />}
                  title="No guessed coordinates"
                  body="A record is plotted only when a published coordinate exists. Demonstration coordinates are approximate and hidden on the map by default."
                />
                <Principle
                  icon={<GitBranch size={16} />}
                  title="Accountability is evidenced"
                  body="Representatives are listed for context. A project is linked to a representative only after a verified constituency match or an administrator's source-backed check."
                />
              </div>
            </section>

            <section id="provenance" className="card p-6 scroll-mt-36">
              <p className="eyebrow">Provenance</p>
              <h2 className="mt-1 text-2xl">Five kinds of record</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                A badge is attached to every project card and detail page. The badge is not
                decoration: it tells you how much evidentiary weight the record carries.
              </p>
              <ul className="mt-4 space-y-3">
                {DATA_CLASSES.map((dataClass) => (
                  <li
                    key={dataClass}
                    className="rounded-lg border border-navy-900/10 bg-cream-50/50 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-bold text-navy-900">
                        {DATA_CLASS_LABELS[dataClass]}
                      </p>
                      {dataClass === "demonstration" ? (
                        <Badge tone="gold">Illustrative only</Badge>
                      ) : dataClass === "official" ? (
                        <Badge tone="teal">Highest evidence</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                      {DATA_CLASS_DESCRIPTIONS[dataClass]}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="workflow" className="card p-6 scroll-mt-36">
              <p className="eyebrow">Workflow</p>
              <h2 className="mt-1 text-2xl">From import to publication</h2>
              <ol className="mt-4 space-y-4">
                <Step
                  number="01"
                  title="Import or retrieve"
                  body="An administrator uploads a permitted CSV/XLSX extract, or a configured source connector retrieves records through a documented API. Every imported row is normalised and deduplicated against existing records."
                />
                <Step
                  number="02"
                  title="Imported"
                  body="The record is visible with an “Imported” state. It has not been checked against the original document yet."
                />
                <Step
                  number="03"
                  title="Under review"
                  body="An administrator opens the cited source, checks the values, attaches missing source links and corrects coordinates only where a public source supports them."
                />
                <Step
                  number="04"
                  title="Verified"
                  body="The record has been checked. Its last-verified date is set and the audit log records the account and time of the decision."
                />
                <Step
                  number="05"
                  title="Published"
                  body="A verified record with a source URL can be published. Publishing without a source URL is blocked by the server."
                />
              </ol>
            </section>

            <section id="accountability" className="card p-6 scroll-mt-36">
              <p className="eyebrow">Political accountability</p>
              <h2 className="mt-1 text-2xl">Representation is not responsibility</h2>
              <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-50/70 px-3.5 py-3">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-[11.5px] leading-relaxed text-[#6b5412]">
                  An MP, MLA or councillor represents a geographic area. That does not mean
                  they sanctioned, funded, approved or executed a specific project. The
                  platform will not imply otherwise.
                </p>
              </div>
              <div className="mt-4 space-y-3 text-[12px] leading-relaxed text-ink-600">
                <p>
                  The <strong>Who is responsible for this project?</strong> section shows the
                  documented chain of authority: funding authority, executing department,
                  implementing agency, tendering authority, contractor and supervising
                  department. Each field is shown only when a cited public source supports
                  it.
                </p>
                <p>
                  Elected representatives for the project's area are displayed in a separate
                  context block. A representative is attributed to a project only when there
                  is a verified point-in-polygon constituency match or an
                  administrator-verified link with a source. Otherwise the page says{" "}
                  <strong>“Constituency not verified.”</strong> and{" "}
                  <strong>“Representative information unavailable.”</strong> where
                  applicable.
                </p>
                <p>
                  Representative records carry a last-verified date and a verification state.
                  The platform does not claim to be a live register of current officeholders.
                </p>
              </div>
            </section>

            <section id="complaints" className="card p-6 scroll-mt-36">
              <p className="eyebrow">Citizen reports</p>
              <h2 className="mt-1 text-2xl">Complaints are evidence of concern, not findings</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-600">
                A complaint is a signed-in citizen's observation. It is published with the
                author's display name, the project it concerns and a status. An official or
                administrator can record a response and change the status. Resolution rates
                are calculated only from complaints filed on this platform; they are not an
                official government performance metric. Samaj Darpan does not automatically
                forward complaints to departments.
              </p>
            </section>

            <section id="corrections" className="card p-6 scroll-mt-36">
              <p className="eyebrow">Corrections & privacy</p>
              <h2 className="mt-1 text-2xl">How to challenge a record</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-[12px] font-bold text-navy-900">Corrections</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    Corrections require a public source. Administrators record the before
                    and after values in the audit log. A record can be marked outdated or
                    rejected when a source no longer supports it.
                  </p>
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-navy-900">Privacy</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                    Public pages show a complaint's author display name, not their email or
                    phone. Passwords are stored as scrypt hashes. Sessions use an HTTP-only
                    cookie. Admin credentials are provisioned server-side and are never
                    bundled into the frontend.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-navy-900/10 bg-navy-950 p-6 text-cream-50">
              <Landmark size={20} className="text-teal-400" />
              <h2 className="mt-2 font-display text-2xl">Independence</h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-cream-50/65">
                Samaj Darpan is an independent civic transparency project. It is not an
                official government website and is not affiliated with any political party.
                Where the public record is incomplete, the platform says so rather than
                filling the gap.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/sources" className="btn btn-gold btn-sm">
                  Source status <ArrowRight size={12} />
                </Link>
                <Link
                  to="/projects"
                  className="btn border border-white/20 bg-white/5 btn-sm text-cream-50 hover:bg-white/10"
                >
                  Browse records
                </Link>
              </div>
            </section>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-[136px] lg:self-start">
            <section className="card p-4">
              <h2 className="font-display text-lg">On this page</h2>
              <nav className="mt-2 space-y-1 text-[11px] font-semibold text-ink-500">
                <a href="#principles" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Founding rule</a>
                <a href="#provenance" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Provenance labels</a>
                <a href="#workflow" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Verification workflow</a>
                <a href="#accountability" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Political accountability</a>
                <a href="#complaints" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Citizen complaints</a>
                <a href="#corrections" className="block rounded px-1 py-1 hover:bg-cream-50 hover:text-navy-900">Corrections & privacy</a>
              </nav>
            </section>

            <section className="card p-4">
              <h2 className="font-display text-lg">Quick checks</h2>
              <ul className="mt-2 space-y-2 text-[10.5px] text-ink-500">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-teal-600" />
                  Does the record show a source and retrieval date?
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-teal-600" />
                  Is the financial figure present, or explicitly unavailable?
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-teal-600" />
                  Is the representative link verified, or only contextual?
                </li>
                <li className="flex items-start gap-1.5">
                  <FileSearch size={12} className="mt-0.5 shrink-0 text-teal-600" />
                  Open the cited source before relying on a value.
                </li>
                <li className="flex items-start gap-1.5">
                  <Users size={12} className="mt-0.5 shrink-0 text-teal-600" />
                  Report a problem from your account if something is wrong.
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-gold-500/35 bg-gold-100/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gold-600">
                Demonstration data
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#6b5412]">
                Gold-labelled records exist only to demonstrate the interface. They carry no
                financial, contractor or location claim and complaints are disabled on them.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Principle({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-navy-900/10 bg-cream-50/50 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-teal-700">
        {icon}
      </span>
      <p className="mt-2 text-[11.5px] font-bold text-navy-900">{title}</p>
      <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 font-display text-[11px] text-cream-50">
        {number}
      </span>
      <div>
        <p className="text-[12px] font-bold text-navy-900">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{body}</p>
      </div>
    </li>
  );
}
