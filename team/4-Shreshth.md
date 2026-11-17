# Team Contribution 4 — Shreshth

**Role:** UI Design System, Navigation Shell, City Location Selector, Indian Formatting Utilities & Transparency Pages Developer  
**Project:** Samaj Darpan — India's Civic Infrastructure Transparency Platform  

---

## 1. Overview of My Contribution

I designed and implemented the **visual design system, reusable UI component library, responsive navigation shell, 40-city Location Selector (with GPS nearest-city detection), Indian Rupee & date formatting utilities, and the Accountability, Contractors, Sources, and Methodology pages**.

My work ensures that:
1. Every page in Samaj Darpan shares a cohesive, editorial civic design system (`Fraunces` serif headings, `Manrope` body typography, Navy/Teal/Gold/Cream palette) and accessible UI primitives (`Button`, `Badge`, `Modal`, `Tabs`, `Toast`).
2. Users can switch between **All India** and **40 Indian cities across 4 zones** from the header dropdown—or click **"Detect my location"** to automatically select the nearest covered city using the Haversine great-circle distance formula.
3. All monetary figures are formatted in authentic Indian numbering (`₹17,843 crore`, `₹8.6 lakh`) and missing values consistently display *"Information not publicly available."*
4. The **Political Accountability (`/representatives`)**, **Contractors (`/contractors`)**, **Data Sources (`/sources`)**, and **Methodology (`/methodology`)** pages clearly explain data provenance and separate geographic representation from project responsibility.

---

## 2. Files Created & Owned by Shreshth

| File Path | Purpose |
|---|---|
| [`src/styles.css`](../src/styles.css) | Tailwind CSS v4 theme variables (colors, fonts, shadows), base typography rules, component classes (`.card`, `.btn`, `.input`, `.badge`, `.skeleton`), and keyframe animations. |
| [`src/components/ui.tsx`](../src/components/ui.tsx) | Core UI component library: `Logo`, `Button`, `Badge`, `StatusBadge`, `DataClassBadge`, `VerificationBadge`, `DataProvenanceNotice`, `PageHeader`, `SectionHeading`, `Stat`, `EmptyState`, `ErrorState`, `LoadingBlock`, `Tabs`, `Modal`, and `SourceLine`. |
| [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx) | Sticky header navigation bar, user profile dropdown menu, responsive mobile navigation drawer, scroll-to-top handler, and site footer. |
| [`src/components/layout/LocationSelector.tsx`](../src/components/layout/LocationSelector.tsx) | Interactive city selector modal/dropdown with instant search, "All India" reset, "Detect my location" GPS button, recent cities history, popular cities pills, and 4 regional zones. |
| [`src/context/CityContext.tsx`](../src/context/CityContext.tsx) | Global React context persisting the selected city and 5 most recent cities in `localStorage` (`sd.city`, `sd.recentCities`) with cross-tab `storage` event synchronization. |
| [`src/context/ToastContext.tsx`](../src/context/ToastContext.tsx) | Accessible `aria-live="polite"` toast notification system with auto-dismiss (5.2s) and 4 visual tones (`success`, `error`, `warning`, `info`). |
| [`src/shared/cities.ts`](../src/shared/cities.ts) | Registry of 40 Indian cities across *North*, *West*, *South*, and *East & Central* zones, plus city search, route helpers, and `distanceKm` / `nearestCity` Haversine geolocation math. |
| [`src/shared/format.ts`](../src/shared/format.ts) & [`src/shared/types.ts`](../src/shared/types.ts) | Indian Rupee formatters (`formatINR`, `formatINRCompact`), date/relative-time formatters (`formatDate`, `relativeDate`), label dictionaries, and shared TypeScript interfaces. |
| [`src/pages/Representatives.tsx`](../src/pages/Representatives.tsx) & [`src/components/RepresentativeCard.tsx`](../src/components/RepresentativeCard.tsx) | Political Accountability directory and representative cards showing MP/MLA constituency, party, term, ECI source link, and verification badge. |
| [`src/pages/Contractors.tsx`](../src/pages/Contractors.tsx) | Contractor directory listing organizations named in cited public project records and their linked projects. |
| [`src/pages/Sources.tsx`](../src/pages/Sources.tsx), [`src/pages/Methodology.tsx`](../src/pages/Methodology.tsx), [`src/pages/NotFound.tsx`](../src/pages/NotFound.tsx) | Public transparency pages explaining the 5 data source connectors, the 5 provenance badges, the verification workflow, and the 404 fallback page. |

---

## 3. Easy Code Walkthrough (How My Parts Work)

### 3.1 Indian Rupee Formatting (`src/shared/format.ts`)
In India, large infrastructure budgets are read in **lakhs** ($10^5$) and **crores** ($10^7$) rather than millions/billions. I wrote `formatINRCompact()` to convert raw rupee numbers into readable Indian units—and return `null` when data is missing so the UI never shows a fake `₹0`:
```ts
export function formatINRCompact(value: number | null | undefined): string | null {
  if (!isKnownNumber(value)) return null;
  const abs = Math.abs(value);
  if (abs >= 1e12) return `₹${trim(value / 1e12)} lakh crore`;
  if (abs >= 1e7) return `₹${trim(value / 1e7)} crore`;
  if (abs >= 1e5) return `₹${trim(value / 1e5)} lakh`;
  if (abs >= 1e3) return `₹${trim(value / 1e3)} thousand`;
  return `₹${trim(value)}`;
}
```

### 3.2 "Detect My Location" & Nearest City Calculation (`src/shared/cities.ts` & `src/context/CityContext.tsx`)
When a user clicks **"Detect my location"** in the header:
1. `CityContext.tsx` calls the browser's `navigator.geolocation.getCurrentPosition()` API to get the user's latitude and longitude.
2. `nearestCity(lat, lng)` in `src/shared/cities.ts` loops through all 40 cities in `CITIES` and calculates the **Haversine great-circle distance** (`distanceKm`) on Earth's sphere ($R = 6371\text{ km}$), returning the closest city and saving it to `localStorage`.

### 3.3 Provenance & Status Badges (`src/components/ui.tsx`)
Every record on the platform displays two key badges from `src/components/ui.tsx`:
- **`StatusBadge`:** Shows whether a project is *Planned*, *Ongoing*, *Completed*, *Delayed*, or *Stalled*.
- **`DataClassBadge`:** Shows the evidentiary weight of the record:
  - *Official data* (Teal)
  - *Admin verified* (Green)
  - *Public record / Imported* (Navy)
  - *Citizen submitted* (Violet)
  - *Demonstration* (Gold — used for illustrative records so users never confuse demo data with real projects)

### 3.4 Political Accountability & Contractors Pages (`src/pages/Representatives.tsx` & `src/pages/Contractors.tsx`)
- **`Representatives.tsx`:** Displays elected representatives (seeded from 2024 Election Commission of India results) with role filter pills (*All roles*, *Members of Parliament*, *MLAs*, *Mayors*, *Councillors*) and instant search by name, party, or constituency.
- **`Contractors.tsx`:** Groups public projects by their named contractor and links directly to the cited government source URL.

---

## 4. Viva / Presentation Q&A Cheat Sheet (Simple & Direct)

- **Q: How does the City Selector remember the user's chosen city when they refresh the page or open a new tab?**  
  **A:** In `src/context/CityContext.tsx`, whenever `selectCity()` is called, we store the city slug in `localStorage` under `"sd.city"` and listen to the browser's `window.addEventListener("storage", ...)` event so all open tabs stay in sync automatically.
- **Q: How does "Detect my location" find the user's city without calling a paid external geocoding API?**  
  **A:** We use the browser's built-in `navigator.geolocation` API to get `(lat, lng)` and run the Haversine distance formula (`distanceKm` in `src/shared/cities.ts`) against the coordinates of our 40 supported cities to pick the closest one locally in the browser.
- **Q: What happens in the UI when a project's budget or contractor is `null` (missing)?**  
  **A:** Instead of showing `₹0` or guessing a value, our formatting helpers return `null` and the UI renders the `<Unavailable />` component from `src/components/ui.tsx`, which displays *"Information not publicly available."*
- **Q: Why does the Representatives page have a warning banner about political responsibility?**  
  **A:** Because an MP or MLA represents a geographic area, which is different from the executive department that sanctioned or funded a specific project. We list area representatives for civic context and only mark them as project-specific if an administrator links them with a verified source.
