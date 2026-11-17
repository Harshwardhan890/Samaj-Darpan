# Team Contribution 2 — Surya

**Role:** Public Civic Dashboards, Data Visualization, Projects Explorer & GIS Map Developer  
**Project:** Samaj Darpan — India's Civic Infrastructure Transparency Platform  

---

## 1. Overview of My Contribution

I designed and implemented the **public civic discovery experience, dashboard analytics, Recharts data visualizations, project exploration & detail views, and interactive Leaflet GIS map**—along with the public backend query and aggregation endpoints that power them.

My work ensures that:
1. Citizens can explore public infrastructure at the **All-India national level** or drill into any of **40 covered cities** (`/cities/:state/:city`) with real-time statistics and coverage indicators.
2. All charts and metrics strictly reflect documented figures—never interpolating missing years or treating `null` values as zero.
3. The **Projects Directory (`/projects`)** and **7-tab Project Detail view (`/projects/:id`)** synchronize filters with URL search parameters so every filtered view or tab can be bookmarked and shared.
4. The **Map Explorer (`/map`)** plots verified project coordinates on OpenStreetMap via React-Leaflet while keeping unverified coordinates and demonstration markers clearly separated.

---

## 2. Files Created & Owned by Surya

| File Path | Purpose |
|---|---|
| [`server/project-routes.ts`](../server/project-routes.ts) | Public REST API endpoints for project search/filtering/sorting/pagination (`/api/projects`), project details (`/api/projects/:id`), dashboard aggregations (`/api/dashboard`), representatives, contractors, and constituency GeoJSON. |
| [`src/pages/Dashboard.tsx`](../src/pages/Dashboard.tsx) | National & City Overview dashboard featuring hero statistics, data provenance notices, coverage progress bars, 5 analytical charts, recent sourced records, and area representatives. |
| [`src/pages/CityDashboard.tsx`](../src/pages/CityDashboard.tsx) | URL-driven route wrapper (`/cities/:state/:city`) that synchronizes the active city from the URL and renders the city-scoped dashboard. |
| [`src/components/charts.tsx`](../src/components/charts.tsx) | Reusable Recharts visualization suite: `BudgetByYearChart`, `StatusDonut`, `CategoryChart`, `DepartmentBars`, `BudgetComparison`, `ResolutionGauge`, and `ProvenanceStrip`. |
| [`src/pages/Projects.tsx`](../src/pages/Projects.tsx) | Public project explorer with debounced full-text search, category/status/provenance filters, sorting (`recent`, `name`, `budget`, `progress`), grid/list toggle, pagination, and URL query sync. |
| [`src/pages/ProjectDetail.tsx`](../src/pages/ProjectDetail.tsx) | Comprehensive 7-tab project record view: *Overview*, *Financial details*, *Construction progress*, *Contractor*, *Political accountability*, *Documents & sources*, and *Citizen complaints*. |
| [`src/components/ProjectCard.tsx`](../src/components/ProjectCard.tsx) | Project presentation components (`ProjectCard`, `ProjectRow`, `ProjectMini`, `ProjectFinancial`, and `CategoryIcon` mapping 14 infrastructure categories to Lucide icons). |
| [`src/pages/MapExplorer.tsx`](../src/pages/MapExplorer.tsx) | Interactive GIS map explorer with sidebar list, category/status filters, opt-in demonstration marker toggle, map/list view switcher, and selected-record summary card. |
| [`src/components/maps.tsx`](../src/components/maps.tsx) | Leaflet map components (`ProjectMap`, `StaticMap`, `projectMarkerIcon`) with status-colored pins, 350m radius site circles, and interactive popups. |
| [`src/hooks/useApiData.ts`](../src/hooks/useApiData.ts) & [`src/services/api.ts`](../src/services/api.ts) | AbortController-backed data-fetching hook (`useApiData`) and typed `apiFetch` client with query-string builder (`qs`). |

---

## 3. Architecture & Key Technical Walkthroughs

### 3.1 Dashboard Aggregation Engine (`server/project-routes.ts`)
- `buildStats(projects, complaints)` computes real-time aggregates for whatever scope is active (All India, a specific state, or a specific city):
  - Status counts (`ongoing`, `completed`, `delayed + stalled`, `planned`).
  - Documented budget & expenditure sums (computed only across records where financial numbers are published; returns `null` rather than `0` if no records publish financials).
  - `budgetByYear`: groups approved project budgets by recorded start year (`UTCFullYear`) for the bar chart without fabricating intermediate years.
  - `byCategory`, `byStatus`, `byDepartment`, and `byProvenance` facets.

### 3.2 Honest Civic Data Visualizations (`src/components/charts.tsx`)
- Built 6 specialized chart components using **Recharts** (`ResponsiveContainer`, `BarChart`, `PieChart`) and custom CSS gauges:
  1. **`BudgetByYearChart`:** Vertical bar chart of approved costs by start year, formatted in compact Indian Rupees (`₹ crore` / `₹ lakh crore`).
  2. **`StatusDonut`:** Donut chart with center total counter and color-coded legend (`ongoing` teal, `completed` green, `delayed` amber, `stalled` red, `planned` slate).
  3. **`CategoryChart`:** Horizontal bar chart across the 14 infrastructure categories.
  4. **`DepartmentBars` & `BudgetComparison`:** Progress bars comparing top implementing agencies and approved cost vs. documented expenditure per project.
  5. **`ProvenanceStrip` & `ResolutionGauge`:** Proportional strip of record classifications (`official`, `admin-verified`, `imported`, `demonstration`) and conic-gradient complaint resolution gauge.

### 3.3 URL-Synchronized Projects Explorer & 7-Tab Detail View (`src/pages/Projects.tsx` & `src/pages/ProjectDetail.tsx`)
- **`Projects.tsx`:** Uses `useSearchParams()` + a 320ms debounce on the search input so typing searches smoothly while syncing `?city=`, `?q=`, `?category=`, `?status=`, `?dataClass=`, `?sort=`, and `?page=` directly into the browser URL.
- **`ProjectDetail.tsx`:** Renders 7 structured tabs (`?tab=overview|financials|progress|contractor|accountability|documents|complaints`) and automatically highlights which core fields are missing from the public record under *"What the public record does not show"*.

### 3.4 Verified-Only GIS Map Plotting (`src/pages/MapExplorer.tsx` & `src/components/maps.tsx`)
- In `MapExplorer.tsx`, a project is plotted on the Leaflet map **only** if `p.lat !== null && p.lng !== null && (p.coordinatesVerified || (showDemo && p.dataClass === "demonstration"))`.
- Sourced records whose coordinates have not yet been verified by an administrator are listed in the sidebar as *"coordinate awaiting verification"* and never plotted at a guessed point.

---

## 4. API Endpoints Built by Surya

| Method & Endpoint | Description |
|---|---|
| `GET /api/projects` | Supports `state`, `city`, `category`, `status`, `q`, `dataClass`, `verification`, `includeDemo`, `sort` (`recent`, `budget`, `name`, `progress`), `page`, and `pageSize`. Returns paginated items, facet counts, and scope summary. |
| `GET /api/projects/:id` | Returns the full project record, area representatives, admin-verified representative links, public complaints, and source metadata. |
| `GET /api/dashboard` | Returns scoped `DashboardStats`, up to 12 area representatives, 5 newest non-demo projects, and recent source runs. |

---

## 5. Viva / Presentation Q&A Cheat Sheet

- **Q: How does the frontend prevent race conditions when a user switches cities or types quickly in the search box?**  
  **A:** `src/hooks/useApiData.ts` creates a fresh `AbortController` on every dependency change and aborts the previous in-flight `fetch` request, while `Projects.tsx` debounces text input by 320ms.
- **Q: How does the Map Explorer distinguish between verified project sites and demo markers?**  
  **A:** `src/components/maps.tsx` renders verified markers as solid status-colored pins (`sd-marker-pin`) and demo markers as dashed gold pins (`sd-marker-demo`), which are hidden by default until the user checks *"Show demonstration markers"*.
- **Q: Why do some charts show an `EmptyState` when filtering to certain cities?**  
  **A:** By design, Samaj Darpan never invents or interpolates missing financial or timeline data. If no record in the active city publishes both a start year and an approved cost, `BudgetByYearChart` renders an explanatory `EmptyState` instead of an empty or fake axis.
