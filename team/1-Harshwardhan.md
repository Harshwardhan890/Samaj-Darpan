# Team Contribution 1 — Harshwardhan

**Role:** Lead Backend Engineer, Database Architect & Data Pipeline Developer  
**Project:** Samaj Darpan — India's Civic Infrastructure Transparency Platform  

---

## 1. Overview of My Contribution

I designed and implemented the **core backend server, persistence engine, data ingestion/normalization pipeline, administrative verification APIs, and end-to-end automated test suite** for Samaj Darpan.

My work ensures that:
1. The Express 5 server securely serves both the REST API (`/api/*`) and the production React SPA (`dist/`).
2. All project, user, complaint, representative, and audit records are persisted atomically to disk (`server/data/db.json`) with crash recovery and automatic first-boot seeding.
3. Public datasets (CSV/XLSX uploads and Open Government Data API feeds) are normalized without ever guessing or fabricating missing figures (e.g., enforcing explicit currency units like `crore` or `lakh`, bounding coordinates to India, and flagging duplicates instead of silently overwriting).
4. Every administrative action is role-guarded on the server and recorded in an append-oriented audit log with `before` and `after` snapshots.

---

## 2. Files Created & Owned by Harshwardhan

| File Path | Purpose |
|---|---|
| [`server/index.ts`](../server/index.ts) | Express 5 bootstrap, security headers, Content Security Policy (CSP), rate limiting, static SPA serving, optional scheduler, and graceful shutdown. |
| [`server/db.ts`](../server/db.ts) | Atomic JSON database engine (`getDb`, `saveDb`, `writeNow`, `reseed`), session management, audit logging, and source connector status definitions. |
| [`server/seed-data.ts`](../server/seed-data.ts) | Curated seed dataset: 5 sourced official public records (MMRDA & PIB), 40 labelled demonstration records across 20 cities, and 48 Lok Sabha 2024 representatives. |
| [`server/seed.ts`](../server/seed.ts) | CLI script (`npm run seed`) to force-reset the database to its clean initial state. |
| [`server/dataSources/normalize.ts`](../server/dataSources/normalize.ts) | Data normalization engine: maps spreadsheet column aliases, parses INR units (`crore`, `lakh`, `thousand`, `inr`), validates Indian coordinates, and infers project categories/statuses. |
| [`server/dataSources/index.ts`](../server/dataSources/index.ts) | Data source connectors for Open Government Data (`data.gov.in`) live API retrieval and manual-import descriptors for PAIMANA, Smart Cities, PMGSY GeoSadak, and eProcurement. |
| [`server/upsert.ts`](../server/upsert.ts) | Deduplication and upsert engine: refreshes existing records when `sourceId + sourceOrganisation` match, and flags same-name records in the same city/state as duplicate candidates. |
| [`server/admin-routes.ts`](../server/admin-routes.ts) | Administrator REST API (`/api/admin/*`) for overview metrics, record editing, verification state transitions, duplicate merging, CSV/XLSX import, GeoJSON boundary upload, user role management, and CSV/JSON export. |
| [`server/api.test.ts`](../server/api.test.ts) | Automated end-to-end API integration test suite (`npm test`) covering public routes, auth lifecycle, complaint jurisdiction rules, and admin pipelines. |
| [`Dockerfile`](../Dockerfile) & [`render.yaml`](../render.yaml) | Production containerization and Render cloud deployment blueprint with persistent disk mounting (`DATA_DIR`). |

---

## 3. Architecture & Key Technical Walkthroughs

### 3.1 Express 5 Server Bootstrap & Security (`server/index.ts`)
- Configured `app.set("trust proxy", 1)` for reverse-proxy compatibility in cloud deployments.
- Added security headers on every response (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a strict `Content-Security-Policy` in production).
- Configured graceful shutdown on `SIGINT` and `SIGTERM` that synchronously flushes pending database writes via `writeNow()` before closing the HTTP server.

### 3.2 Atomic JSON Persistence Store (`server/db.ts`)
- To prevent corrupted JSON files if the process crashes mid-write, `writeNow()` writes to a process-scoped temporary file (`db.json.<pid>.tmp`) and uses an atomic POSIX `fs.renameSync(tmp, DB_PATH)`:
  ```ts
  export function writeNow(): void {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!db) return;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_PATH);
  }
  ```
- High-frequency mutations use a 40ms debounced `saveDb()` timer, while corrupt files are automatically backed up to `db.json.corrupt-<timestamp>` before reseeding.

### 3.3 Honest Data Normalization Pipeline (`server/dataSources/normalize.ts`)
- **Strict Currency Parsing (`parseMoney`):** Government spreadsheets report amounts in varying units. Rather than guessing what a bare number means, `parseMoney()` inspects the column header:
  - `_crore` / `cr` $\rightarrow \times 10^7$
  - `_lakh` $\rightarrow \times 10^5$
  - `_thousand` $\rightarrow \times 10^3$
  - `_inr` / `rupee` $\rightarrow \times 1$
  - If a column is named bare `cost` or `budget` without a unit, the amount is left `null` and a warning is attached to the import job.
- **Coordinate Bounding & Verification:** Coordinates are accepted only within India's bounding box ($\text{lat} \in [6^\circ, 38^\circ]$, $\text{lng} \in [68^\circ, 98^\circ]$) and always start with `coordinatesVerified: false` until an administrator verifies them against the cited source.

### 3.4 Deduplication & Verification Rules (`server/upsert.ts` & `server/admin-routes.ts`)
- **Upsert vs. Duplicate Flagging:** When re-importing a dataset, if a row matches an existing record's `sourceId` and `sourceOrganisation`, non-null fields are refreshed in place. If a row has no matching `sourceId` but shares a normalized name and city/state with an existing record, it is inserted and added to `duplicateCandidates` so an administrator can review and merge them via `POST /api/admin/duplicates/resolve`.
- **Server-Enforced Verification Rules:**
  1. A record **cannot** be moved to `published` unless `sourceUrl` is present.
  2. Records with `dataClass === "demonstration"` **cannot** be marked `verified` or `published`.
  3. Marking `coordinatesVerified: true` requires valid `lat` and `lng` values.

---

## 4. API Endpoints Built by Harshwardhan

| Method & Endpoint | Description |
|---|---|
| `GET /api/health` | Returns server status, timestamp, `demoMode` flag, and connector statuses. |
| `GET /api/sources` | Lists all 5 data source connectors, configuration status, and record counts. |
| `GET /api/admin/overview` | Returns record counts, data quality coverage %, verification queue, duplicate candidates, recent imports, and recent audit entries. |
| `GET /api/admin/projects` | Paginated admin project search and verification-state filter. |
| `PATCH /api/admin/projects/:id` | Updates project fields, enforces coordinate/publish guards, and logs `before`/`after` audit diff. |
| `POST /api/admin/projects/:id/verify` | Transitions verification workflow (`under-review`, `verified`, `published`, `outdated`, `rejected`). |
| `POST /api/admin/projects/:id/representatives` | Links an elected representative to a project with an evidence basis (`admin-verified`, `verified-boundary`, `unverified`). |
| `POST /api/admin/duplicates/resolve` | Copies missing fields from `mergeId` into `keepId` and marks `mergeId` as `rejected`. |
| `POST /api/admin/import` | Multipart CSV/XLSX parser (`multer`, `papaparse`, `xlsx`) supporting up to 2,000 rows and 8 MB files. |
| `POST /api/admin/geo/constituencies` | Validates and stores a GeoJSON `FeatureCollection` of `Polygon`/`MultiPolygon` constituency boundaries. |
| `GET /api/admin/export` | Exports all project records as downloadable CSV (`?format=csv`) or JSON (`?format=json`). |

---

## 5. Viva / Presentation Q&A Cheat Sheet

- **Q: How does the database prevent data corruption without an external SQL server?**  
  **A:** `server/db.ts` uses atomic file replacement—writing the full JSON state to a temporary file (`db.json.<pid>.tmp`) and calling `fs.renameSync` to replace `db.json` atomically, plus flushing synchronously on `SIGINT`/`SIGTERM`.
- **Q: How does the CSV/XLSX import handle inconsistent column names and units?**  
  **A:** `server/dataSources/normalize.ts` strips punctuation/casing to match column aliases and only converts financial columns when the header explicitly declares the unit (`crore`, `lakh`, `thousand`, or `inr`).
- **Q: Why are imported coordinates not immediately shown on the public map?**  
  **A:** Public datasets often contain approximate city-center coordinates. Our normalization pipeline sets `coordinatesVerified: false` on import so a record is only plotted after an admin verifies the coordinate against the source document.
