# Samaj Darpan

**Public infrastructure, in public view.**

Samaj Darpan is an independent civic-infrastructure transparency platform for India. It follows
public projects from sanction through construction, shows who funds and executes them, records
which facts are missing, and keeps political responsibility separate from geographic guessing.

It is **not** an official government website. Every record carries its provenance, verification
state and source link. Missing information is displayed as missing — never estimated or invented.

---

## Stack

- **Client:** React 19, TypeScript, Vite 7, Tailwind CSS v4, React Router 7, Recharts, Leaflet/OSM
- **Server:** Express 5, TypeScript (run with `tsx`), Zod validation, `multer`, `xlsx`, `papaparse`
- **Auth:** scrypt password hashing, HTTP-only session cookies, optional Supabase JWT verification
- **Storage:** local JSON store at `server/data/db.json` (generated; gitignored)
- **Audit:** append-oriented JSON audit log for administrative actions

---

## Quick start

```bash
npm install
cp .env.example .env      # optional; the app runs in labelled demo mode without keys
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:8787>
- Health: <http://localhost:8787/api/health>

The JSON store is seeded automatically on first boot. To reset it (destructive — replaces accounts,
projects, complaints and audit history):

```bash
npm run seed
```

### Production build

```bash
npm run build
NODE_ENV=production npm start
```

The Express server serves `dist/` in production. Set `SESSION_SECRET`, serve over HTTPS, and use a
real database before exposing this to the public.

---

## Demo accounts

The sign-in screen offers one-click demo access, so passwords do not need to be present in frontend
code. The seeded credentials are:

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@demo.samajdarpan.in` | `CitizenDemo!2026` |
| Government official | `official@demo.samajdarpan.in` | `OfficialDemo!2026` |
| Administrator | `admin@demo.samajdarpan.in` | `AdminDemo!2026` |

These are shared demonstration accounts. Do not enter personal data into them. Change or remove them
before any real deployment. Administrator self-registration is deliberately impossible; admin
accounts are provisioned server-side.

---

## What is real, and what is demonstration

### Sourced records (5)

Five records were transcribed from official pages, with source URL and retrieval date retained:

| Record | Source |
|---|---|
| Atal Bihari Vajpayee Sewri–Nhava Sheva Atal Setu | MMRDA project page |
| Chennai Metro Rail Project — Phase II | Press Information Bureau |
| Patna Metro Rail Project — Phase I | Press Information Bureau |
| Delhi Metro Phase V(A) — three new corridors | Press Information Bureau |
| Noida International Airport — Phase I | Press Information Bureau |

Unknown fields are `null` and render as **“Information not publicly available.”** No expenditure,
contractor, progress or coordinate figure is inferred.

### Demonstration records (40)

Forty records exist only to exercise lists, filters, charts and the map. They are:

- labelled **Demonstration** with a gold badge;
- stripped of every financial, contractor and progress claim;
- given illustrative coordinates flagged `coordinatesVerified: false`;
- hidden from the map unless **“Show demonstration markers”** is enabled;
- excluded from the administrator’s verification queue and data-quality coverage.

### Coordinates

A project is plotted only when a coordinate is both present and marked verified. Imported
coordinates start unverified; an administrator must check the point against the cited source before
it is shown on a map. Project detail pages explain when a supplied coordinate is awaiting
verification instead of plotting it.

### Political responsibility

Representatives are seeded from the 2024 Election Commission of India results and marked
**not re-verified**. The platform never infers project responsibility from geography. A project shows
“Constituency not verified.” or “Representative information unavailable.” until an administrator
links a representative with a documented basis.

---

## Data connectors

| Source | Mode | Notes |
|---|---|---|
| Open Government Data (OGD) India | API | Requires `OGD_API_KEY` and `OGD_RESOURCE_IDS`; held server-side |
| PAIMANA | Manual import | Portal exposes no documented public API for this use |
| Smart Cities Mission | Manual import | Use permitted downloads/exports |
| PMGSY GeoSadak | Manual import | Use permitted downloads/exports |
| Government eProcurement | Manual import | No scraping of restricted portals |

Administrators import CSV/XLSX through `/admin/import`. Column names are matched by alias,
deduplicated, and every row stores source organisation, source URL and retrieval date. Money columns
are parsed only when the column declares a currency unit (`crore`, `lakh`, `thousand`, `inr`);
otherwise the value stays `null` and a warning is recorded.

Automatic refresh is opt-in with `ENABLE_AUTO_REFRESH=true`; it is off by default so deployments do
not make surprise requests.

---

## Administrator workflow

`/admin` provides:

- overview, verification queue and source health;
- project search, editing, coordinate correction and provenance labels;
- the status workflow **Imported → Under Review → Verified → Published**, plus Outdated/Rejected;
- a server-enforced rule that publishing requires a source URL;
- duplicate detection and merging (rejected/merged records leave the queue);
- CSV/XLSX import with row limits and validation;
- user and role management;
- append-oriented audit log with before/after values;
- GeoJSON constituency-boundary upload.

Demonstration records cannot be verified or published.

---

## Environment

Copy `.env.example` to `.env`. All keys are optional for the demo.

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `8787`) |
| `NODE_ENV` | `development` or `production` |
| `SESSION_SECRET` | Long random value for production deployments |
| `COOKIE_SECURE` | Optional override (`true` / `false`) for the `Secure` session cookie flag |
| `DATA_DIR` | Directory holding `db.json` (default `server/data`; mount persistent storage here in production) |
| `DEMO_MODE` | `true` shows portal-less verification/reset links in the UI |
| `OGD_API_KEY` | data.gov.in API key |
| `OGD_RESOURCE_IDS` | Comma-separated OGD resource IDs |
| `VITE_SUPABASE_URL` | Supabase project URL used by the client |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_URL` | Same project URL, used by the server for JWKS verification |
| `SUPABASE_JWT_ISSUER` | Optional issuer override/documentation value |
| `ENABLE_AUTO_REFRESH` | `true` enables the opt-in scheduler |

### Supabase

When Supabase is configured, the client uses Supabase Auth and sends the access token as a bearer
token. The server verifies the signature against the project JWKS and trusts **only**
`app_metadata.role` for authorisation. `user_metadata` is user-editable and never grants official or
admin access. Local email verification and password recovery still work without Supabase.

No SMTP transport is configured. In demo mode, verification and password-reset links are shown on
screen. Production requires an email provider or Supabase email delivery.

---

## Scripts

```bash
npm run dev        # API + Vite together
npm run dev:api    # API only
npm run dev:web    # Vite only
npm run typecheck  # tsc --noEmit
npm test           # end-to-end API integration test suite
npm run build      # typecheck + production bundle
npm start          # production server (serve dist/)
npm run seed       # destructive reseed of the JSON store
```

---

## Deployment

### Option 1: Render (Blueprint via `render.yaml`)

1. Push the repository to GitHub/GitLab and create a new **Blueprint** on Render pointing to `render.yaml`.
2. Render automatically provisions a Node web service (`npm ci && npm run build`, `npm start`), a 1 GB persistent disk mounted at `/var/data/samaj-darpan` (`DATA_DIR`), health check at `/api/health`, and a generated `SESSION_SECRET`.
3. Optionally set `OGD_API_KEY`, `OGD_RESOURCE_IDS`, or Supabase variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`) in the Render environment dashboard.

### Option 2: Docker (`Dockerfile`)

```bash
docker build -t samaj-darpan .
docker run -p 8787:8787 \
  -e SESSION_SECRET="replace-with-long-random-secret" \
  -v samaj-darpan-data:/app/server/data \
  samaj-darpan
```

---

## Verification performed

Checked on 2 November 2026 against a local build:

- All public routes render: overview, projects, project detail (all seven tabs), city dashboard, map,
  representatives, contractors, complaints, sources, methodology, account, 404 handling.
- All admin routes render and enforce server-side role checks.
- Registration, demo-mode email verification link, login/logout, protected-route redirects,
  forgot-password and single-use reset all work.
- Citizen and official accounts receive `403` from admin endpoints; citizen sees an access-restricted
  page; official can access the complaint review queue.
- CSV and XLSX import, row validation, unsupported-file rejection and import history.
- Coordinate verification policy: imported coordinates stay unverified and are not plotted; project
  detail explains why.
- Duplicate detection/merging and removal of merged records from the queue.
- Publish guard rejects publication without a source URL; demonstration records cannot be published.
- GeoJSON upload rejects non-FeatureCollections and stores a valid boundary file.
- Complaint filing, official response/status update, and audit entries.
- City search, selection persistence, and nearest-city geolocation detection (simulated coordinates).
- Map marker visibility, demonstration toggle, list/map switch, and unverified-coordinate exclusion.
- Responsive navigation below the desktop breakpoint (1000 px window), including the mobile drawer.

### Not tested / not available here

- Live OGD retrieval (no API key was configured).
- Live Supabase sign-in and Supabase email delivery (no Supabase project was configured).
- PAIMANA, Smart Cities, GeoSadak and eProcurement live fetching — those portals were unreachable or
  have no documented public API for this use; only the manual import path is supported.
- A real 390 px phone viewport (the in-app browser window could not be resized below 1000 px).
  Responsive classes and the sub-`lg` drawer were exercised at 1000 px.
- Load, penetration and multi-instance concurrency testing.
- Production email delivery, because no mail transport is configured.

---

## Project layout

```
server/
  index.ts             Express bootstrap, security headers, static serving, scheduler
  auth.ts              session/JWT resolution and role guards
  auth-routes.ts       register, login, verify, reset, profile, password change
  admin-routes.ts      import, verification, duplicates, users, audit, geo, export
  project-routes.ts    public projects, dashboard, representatives, complaints
  dataSources/         connectors, normalisation and deduplication
  db.ts, seed-data.ts  JSON store and seed content
  password.ts          scrypt hashing, tokens, IDs
src/
  App.tsx, main.tsx    routes and providers
  context/             auth, city selection, toasts
  components/          shell, UI primitives, charts, maps, protected routes
  pages/               public, auth and admin pages
  shared/              types, 40-city registry, formatting
```

---

## Deployment and security notes

- The JSON store is single-process and not suitable for horizontal scaling. Use Postgres (or similar)
  with transactional writes in production.
- The audit log is append-oriented, not cryptographically immutable. Ship it to append-only storage
  if it must be defensible.
- Session cookies are `HttpOnly` and `SameSite=Lax`; set `NODE_ENV=production` to enable `Secure` and
  the production CSP.
- Rate limits are in-memory and reset on restart.
- Never put admin credentials or API keys in client code. OGD and Supabase secrets stay server-side.
- This platform records public information. It does not forward complaints to government departments
  and does not claim to be an official grievance channel.

---

## Imagery and attribution

- `public/images/atal-setu.jpg` — Wikimedia Commons, CC0. Representative infrastructure photograph,
  not evidence for any project.
- `public/images/auth-hero.jpg` — Wikimedia Commons, CC0.
- Map tiles © OpenStreetMap contributors.

See `public/images/ATTRIBUTION.md` for details.
