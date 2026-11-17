# Team Contribution 3 — Tanish

**Role:** Authentication, Security, Role-Based Access Control (RBAC), Citizen Complaints & Admin Console UI Developer  
**Project:** Samaj Darpan — India's Civic Infrastructure Transparency Platform  

---

## 1. Overview of My Contribution

I designed and implemented the **authentication and security layer, role-based access control (RBAC), citizen complaint filing and official review workflows, and the Administrator Console user interface**.

My work ensures that:
1. Passwords are never stored in plain text—they are hashed with Node's cryptographic `scrypt` (`server/password.ts`) and verified using constant-time comparison (`crypto.timingSafeEqual`).
2. Sessions use `HttpOnly`, `SameSite=Lax` cookies (or verified Supabase JWKS Bearer tokens where only `app_metadata.role` is trusted), and sensitive endpoints are protected by per-IP rate limiting (`server/rateLimit.ts`) and server-side role guards (`requireAuth`, `requireRole`).
3. Citizens can file public or non-public complaints on real projects, and **Government Officials** can review and resolve complaints **only within their own state jurisdiction**.
4. Administrators have a complete 7-screen management console (`/admin/*`) to review records, import CSV/XLSX files, merge duplicates, manage user roles, upload GeoJSON boundaries, and inspect `before`/`after` audit trails.

---

## 2. Files Created & Owned by Tanish

| File Path | Purpose |
|---|---|
| [`server/password.ts`](../server/password.ts) | `scrypt` password hashing (`scrypt$<salt>$<hash>`), timing-safe verification, SHA-256 token hashing, random token generation, and password strength validation. |
| [`server/auth.ts`](../server/auth.ts) | Session cookie and Supabase JWKS JWT resolution (`attachUser`), authentication guard (`requireAuth`), and hierarchical role guard (`requireRole("citizen" \| "official" \| "admin")`). |
| [`server/auth-routes.ts`](../server/auth-routes.ts) | Auth REST API (`/api/auth/*`): registration, email verification, login, one-click demo login, logout, single-use forgot/reset password, profile update, and password change. |
| [`server/rateLimit.ts`](../server/rateLimit.ts) | Fixed-window in-memory IP rate limiter protecting `/api`, `/login`, `/register`, `/forgot-password`, and `/reset-password`. |
| [`src/context/AuthContext.tsx`](../src/context/AuthContext.tsx) & [`src/services/supabase.ts`](../src/services/supabase.ts) | React authentication provider managing session state, demo accounts, profile updates, and optional Supabase OAuth/session sync. |
| [`src/components/ProtectedRoute.tsx`](../src/components/ProtectedRoute.tsx) | Client-side route guard (`ProtectedRoute`), `Forbidden` access-restricted screen, `AuthLayout` split-screen shell, and `PasswordStrength` meter. |
| [`src/pages/auth/Login.tsx`](../src/pages/auth/Login.tsx) & [`src/pages/auth/Register.tsx`](../src/pages/auth/Register.tsx) | Sign-in page (with one-click Citizen/Official/Admin demo access) and validated registration page with state/city selection and role cards. |
| [`src/pages/auth/VerifyEmail.tsx`](../src/pages/auth/VerifyEmail.tsx), [`src/pages/auth/ForgotPassword.tsx`](../src/pages/auth/ForgotPassword.tsx), [`src/pages/auth/ResetPassword.tsx`](../src/pages/auth/ResetPassword.tsx) | Single-use token verification and password recovery screens (with StrictMode-safe request deduplication in `VerifyEmail.tsx`). |
| [`src/pages/Account.tsx`](../src/pages/Account.tsx) | Authenticated user account portal with 3 tabs: *Profile details*, *Security (password change & security checklist)*, and *Your activity (personal audit log & complaints)*. |
| [`src/pages/Complaints.tsx`](../src/pages/Complaints.tsx) | Citizen complaints hub with 3 views: *Public reports*, *My reports*, and the *Official Review Queue* (`/complaints?queue=official`). |
| [`src/components/layout/AdminLayout.tsx`](../src/components/layout/AdminLayout.tsx) & [`src/pages/admin/*`](../src/pages/admin/AdminOverview.tsx) | Admin console layout and all 7 admin pages: `AdminOverview`, `AdminProjects`, `AdminImport`, `AdminSources`, `AdminUsers`, `AdminAudit`, and `AdminGeo`. |

---

## 3. Architecture & Key Technical Walkthroughs

### 3.1 Cryptographic Password & Token Security (`server/password.ts` & `server/auth-routes.ts`)
- **Password Hashing:** Uses `crypto.scryptSync(password.normalize("NFKC"), salt, 64)` with a 16-byte random salt and verifies hashes using `crypto.timingSafeEqual` to prevent timing attacks.
- **Hashed Session & Reset Tokens:** Raw session tokens, email verification tokens, and password-reset tokens are never stored in plain text in `db.json`—only their `sha256(token)` digest is stored. Password reset tokens expire after 1 hour and are marked `usedAt` immediately upon use so they cannot be replayed.

### 3.2 Three-Tier Role Hierarchy & Privilege Escalation Prevention (`server/auth.ts`)
- Samaj Darpan enforces three roles ranked numerically: `citizen (1) < official (2) < admin (3)`.
- **No Self-Assigned Admin Access:** Public registration (`POST /api/auth/register`) only accepts `z.enum(["citizen", "official"])`. Even if a user registers as an `official`, their account starts with `officialVerified: false` until an administrator approves them in `/admin/users`.
- **Supabase JWT Safety:** When verifying Supabase JWTs against the project's JWKS endpoint, only `payload.app_metadata.role` is trusted—never `user_metadata` (which is writable by the end user).

### 3.3 Citizen Complaints & State-Scoped Official Review (`src/pages/Complaints.tsx` & `server/project-routes.ts`)
- **Filing Rules:** Signed-in users can file complaints (`quality`, `delay`, `safety`, `cost`, `accessibility`, `corruption`, `other`) with a minimum 6-character title and 30-character description. Filing complaints on demonstration records is blocked in both the UI and API.
- **Jurisdiction Enforcement:** When an official updates a complaint via `PATCH /api/complaints/:id`, the server verifies that `user.officialVerified === true` and that the official's state matches the complaint's `stateSlug` (administrators can review across all states).

### 3.4 Admin Console Interfaces (`src/pages/admin/*`)
- Built the 7 administrative screens inside `AdminLayout.tsx`:
  - **`AdminOverview.tsx`:** KPI cards, data coverage bars, verification queue, duplicate alerts, source health, and recent audit log.
  - **`AdminProjects.tsx`:** Searchable table, `DuplicatePanel` merge UI, CSV export button, and `EditProjectModal` (supporting field edits, workflow transitions, and representative attribution linking).
  - **`AdminImport.tsx`:** Drag-and-drop CSV/XLSX uploader, downloadable column template, warning inspector, and persistent import history.
  - **`AdminUsers.tsx` & `AdminAudit.tsx` & `AdminGeo.tsx`:** Role/verification toggles, expandable `before`/`after` JSON diff viewer, and GeoJSON Polygon validator.

---

## 4. API Endpoints Built by Tanish

| Method & Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Validates input, hashes password, creates unverified account, and returns demo verification link when `DEMO_MODE=true`. |
| `POST /api/auth/verify-email` | Verifies 24-hour single-use email token. |
| `POST /api/auth/login` & `/demo-login` | Authenticates credentials (or demo role), creates session, and sets `HttpOnly` cookie. |
| `POST /api/auth/forgot-password` & `/reset-password` | Issues and consumes 1-hour single-use password reset tokens and invalidates prior sessions. |
| `PATCH /api/auth/profile` & `POST /api/auth/change-password` | Updates user profile / password and writes audit log entries. |
| `POST /api/complaints` & `PATCH /api/complaints/:id` | Creates citizen complaints and records state-scoped official status/resolution updates. |

---

## 5. Viva / Presentation Q&A Cheat Sheet

- **Q: Why did `VerifyEmail.tsx` use a module-level `Map` to cache verification requests?**  
  **A:** Verification tokens are single-use, and React 19 `StrictMode` mounts `useEffect` twice in development. Deduplicating the in-flight promise by token ensures the second mount receives the first request's success response instead of a false "token already used" error.
- **Q: How is privilege escalation prevented if someone tampers with the registration request body?**  
  **A:** The Zod schema on `POST /api/auth/register` strictly allows `["citizen", "official"]` (never `"admin"`), and `official` accounts start with `officialVerified: false` until an admin enables them in `PATCH /api/admin/users/:id`.
- **Q: How are official complaint responses restricted by geography?**  
  **A:** In `PATCH /api/complaints/:id`, if `req.user.role === "official"`, the server compares `slugifyState(user.state)` against `complaint.stateSlug` and returns `403 Forbidden` if they do not match.
