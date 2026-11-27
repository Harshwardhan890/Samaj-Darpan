import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "samaj-darpan-test-"));
process.env.NODE_ENV = "test";
process.env.DEMO_MODE = "true";
process.env.DATA_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, "db.json");

const { app } = await import("./index");
const { writeNow } = await import("./db");

let server: Server;
let baseUrl = "";

async function request(
  endpoint: string,
  options: RequestInit & { cookie?: string } = {},
) {
  const headers = new Headers(options.headers);
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie ? setCookie.split(";")[0] : undefined;
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { status: response.status, body, cookie, headers: response.headers };
}

describe("Samaj Darpan API end-to-end suite", () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    writeNow();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("serves health and source statuses", async () => {
    const health = await request("/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    assert.equal(health.body.demoMode, true);
    assert.ok(Array.isArray(health.body.sources));

    const sources = await request("/api/sources");
    assert.equal(sources.status, 200);
    assert.equal(sources.body.sources.length, 5);
  });

  it("lists, filters, and retrieves public projects and dashboards", async () => {
    const all = await request("/api/projects?pageSize=60");
    assert.equal(all.status, 200);
    assert.equal(all.body.total, 52);
    assert.equal(all.body.scope.official, 12);
    assert.equal(all.body.scope.demonstration, 40);

    const mumbai = await request("/api/projects?city=mumbai");
    assert.equal(mumbai.status, 200);
    assert.ok(mumbai.body.items.some((p: { id: string }) => p.id === "prj-atal-setu"));

    const detail = await request("/api/projects/prj-atal-setu");
    assert.equal(detail.status, 200);
    assert.equal(detail.body.project.name, "Atal Bihari Vajpayee Sewri–Nhava Sheva Atal Setu");
    assert.ok(detail.body.areaRepresentatives.length > 0);
    assert.ok(Array.isArray(detail.body.boundaryMatches));
    assert.ok(detail.body.boundaryMatches.some((b: { name: string }) => b.name === "Mumbai South"));

    const missing = await request("/api/projects/non-existent-id");
    assert.equal(missing.status, 404);

    const dashboard = await request("/api/dashboard?city=mumbai&state=maharashtra");
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.body.scope.cityName, "Mumbai");
    assert.ok(dashboard.body.stats.totalProjects >= 1);
  });

  it("completes registration, email verification, login, profile update, and password reset flows", async () => {
    // Reject weak password (missing symbol)
    const weak = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Test Citizen",
        email: "weak@example.com",
        phone: "9876543210",
        password: "WeakPassword123",
        confirmPassword: "WeakPassword123",
        state: "Maharashtra",
        city: "mumbai",
        role: "citizen",
      }),
    });
    assert.equal(weak.status, 400);

    // Valid registration
    const reg = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Riya Sharma",
        email: "riya@example.com",
        phone: "9876543210",
        password: "StrongPassword!2026",
        confirmPassword: "StrongPassword!2026",
        state: "Maharashtra",
        city: "mumbai",
        role: "citizen",
      }),
    });
    assert.equal(reg.status, 201);
    assert.ok(reg.body.verificationUrl);

    // Duplicate registration rejected
    const dup = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Riya Sharma",
        email: "riya@example.com",
        phone: "9876543210",
        password: "StrongPassword!2026",
        confirmPassword: "StrongPassword!2026",
        state: "Maharashtra",
        city: "mumbai",
        role: "citizen",
      }),
    });
    assert.equal(dup.status, 409);

    // Login before verification rejected
    const unverifiedLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "riya@example.com",
        password: "StrongPassword!2026",
      }),
    });
    assert.equal(unverifiedLogin.status, 403);
    assert.equal(unverifiedLogin.body.code, "email_unverified");

    // Verify email token
    const verifyToken = new URL(reg.body.verificationUrl).searchParams.get("token");
    const verified = await request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: verifyToken }),
    });
    assert.equal(verified.status, 200);

    // Login after verification succeeds
    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "riya@example.com",
        password: "StrongPassword!2026",
        remember: true,
      }),
    });
    assert.equal(login.status, 200);
    assert.ok(login.cookie);

    // Update profile & verify audit log
    const profile = await request("/api/auth/profile", {
      method: "PATCH",
      cookie: login.cookie,
      body: JSON.stringify({
        fullName: "Riya K. Sharma",
        state: "Karnataka",
        city: "bengaluru",
      }),
    });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.fullName, "Riya K. Sharma");
    assert.equal(profile.body.user.city, "bengaluru");

    const myAudit = await request("/api/audit/mine", { cookie: login.cookie });
    assert.equal(myAudit.status, 200);
    assert.ok(myAudit.body.entries.length >= 3);

    // Forgot & reset password (single-use)
    const forgot = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "riya@example.com" }),
    });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.body.resetUrl);
    const resetToken = new URL(forgot.body.resetUrl).searchParams.get("token");

    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password: "NewPassword!2026",
        confirmPassword: "NewPassword!2026",
      }),
    });
    assert.equal(reset.status, 200);

    // Second use of same reset token fails
    const resetAgain = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password: "AnotherPassword!2026",
        confirmPassword: "AnotherPassword!2026",
      }),
    });
    assert.equal(resetAgain.status, 400);
  });

  it("enforces complaint filing rules and state-scoped official review permissions", async () => {
    const citizenLogin = await request("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role: "citizen" }),
    });
    const citizenCookie = citizenLogin.cookie!;

    // Reject complaint on demonstration project
    const demoComplaint = await request("/api/complaints", {
      method: "POST",
      cookie: citizenCookie,
      body: JSON.stringify({
        projectId: "demo-mumbai-1",
        category: "quality",
        title: "Surface defect report",
        description: "This is a test report with more than thirty characters of description.",
        isPublic: true,
      }),
    });
    assert.equal(demoComplaint.status, 400);

    // File valid complaint on Mumbai project (Maharashtra)
    const mumbaiComplaint = await request("/api/complaints", {
      method: "POST",
      cookie: citizenCookie,
      body: JSON.stringify({
        projectId: "prj-atal-setu",
        category: "safety",
        title: "Signage visibility near Sewri interchange",
        description: "Observed faded directional signage on the approach ramp during evening inspection.",
        isPublic: false,
      }),
    });
    assert.equal(mumbaiComplaint.status, 201);
    const mumbaiComplaintId = mumbaiComplaint.body.complaint.id;

    // File valid complaint on Chennai project (Tamil Nadu)
    const chennaiComplaint = await request("/api/complaints", {
      method: "POST",
      cookie: citizenCookie,
      body: JSON.stringify({
        projectId: "prj-chennai-metro-phase-2",
        category: "delay",
        title: "Barricade obstruction along corridor",
        description: "Construction barricades have narrowed pedestrian access for over three weeks.",
        isPublic: true,
      }),
    });
    assert.equal(chennaiComplaint.status, 201);
    const chennaiComplaintId = chennaiComplaint.body.complaint.id;

    // Citizen cannot bypass public filter with ?all=true
    const publicList = await request("/api/complaints?all=true", {
      cookie: citizenCookie,
    });
    assert.equal(publicList.status, 200);
    assert.ok(!publicList.body.complaints.some((c: { id: string }) => c.id === mumbaiComplaintId));

    // Official in Maharashtra can view non-public complaints and update Maharashtra complaint
    const officialLogin = await request("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role: "official" }),
    });
    const officialCookie = officialLogin.cookie!;

    const officialQueue = await request("/api/complaints?all=true&state=maharashtra", {
      cookie: officialCookie,
    });
    assert.equal(officialQueue.status, 200);
    assert.ok(officialQueue.body.complaints.some((c: { id: string }) => c.id === mumbaiComplaintId));

    const updateMumbai = await request(`/api/complaints/${mumbaiComplaintId}`, {
      method: "PATCH",
      cookie: officialCookie,
      body: JSON.stringify({
        status: "resolved",
        resolutionNote: "Signage panel replaced and verified by corridor maintenance team.",
      }),
    });
    assert.equal(updateMumbai.status, 200);
    assert.equal(updateMumbai.body.complaint.status, "resolved");

    // Official in Maharashtra cannot update Tamil Nadu complaint
    const updateChennai = await request(`/api/complaints/${chennaiComplaintId}`, {
      method: "PATCH",
      cookie: officialCookie,
      body: JSON.stringify({
        status: "in-review",
        resolutionNote: "Attempting cross-state update.",
      }),
    });
    assert.equal(updateChennai.status, 403);
  });

  it("enforces admin role guards, CSV import rules, duplicate merging, verification guards, and GeoJSON validation", async () => {
    const citizenLogin = await request("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role: "citizen" }),
    });
    const forbidden = await request("/api/admin/overview", {
      cookie: citizenLogin.cookie,
    });
    assert.equal(forbidden.status, 403);

    const adminLogin = await request("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
    });
    const adminCookie = adminLogin.cookie!;

    // Admin cannot remove own admin access
    const selfDemote = await request("/api/admin/users/usr_demo_admin", {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ role: "citizen" }),
    });
    assert.equal(selfDemote.status, 400);

    // Demonstration record cannot be verified or published
    const verifyDemo = await request("/api/admin/projects/demo-mumbai-1/verify", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ status: "verified" }),
    });
    assert.equal(verifyDemo.status, 400);

    // CSV import with unit-declared cost, unitless cost warning, and duplicate candidate
    const csvContent = [
      "project_name,state,city,category,status,approved_cost_crore,latitude,longitude",
      "Pune Ring Road Western Corridor,Maharashtra,Pune,roads,ongoing,1420,18.5204,73.8567",
      "Pune Ring Road Western Corridor,Maharashtra,Pune,roads,ongoing,1420,,",
    ].join("\n");
    const form = new FormData();
    form.append("file", new Blob([csvContent], { type: "text/csv" }), "pune-import.csv");
    form.append("sourceOrganisation", "Pune Metropolitan Region Development Authority");
    form.append("dataClass", "imported");

    const imported = await request("/api/admin/import", {
      method: "POST",
      cookie: adminCookie,
      body: form,
    });
    assert.equal(imported.status, 201);
    assert.equal(imported.body.outcome.created, 2);
    assert.equal(imported.body.outcome.duplicateCandidates.length, 1);

    const [firstId, secondId] = imported.body.outcome.projectIds as [string, string];

    // Imported coordinates start unverified
    const firstDetail = await request(`/api/projects/${firstId}`);
    assert.equal(firstDetail.status, 200);
    assert.equal(firstDetail.body.project.coordinatesVerified, false);
    assert.equal(firstDetail.body.project.approvedBudget, 14_200_000_000);

    // Publishing without a sourceUrl is blocked by server
    const publishNoUrl = await request(`/api/admin/projects/${firstId}/verify`, {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(publishNoUrl.status, 400);

    // Attach source URL and publish
    const patched = await request(`/api/admin/projects/${firstId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        sourceUrl: "https://pmrda.gov.in/pune-ring-road",
        coordinatesVerified: true,
        verificationStatus: "published",
      }),
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.project.verificationStatus, "published");
    assert.equal(patched.body.project.coordinatesVerified, true);

    // Resolve duplicate
    const merged = await request("/api/admin/duplicates/resolve", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ keepId: firstId, mergeId: secondId }),
    });
    assert.equal(merged.status, 200);

    // Merged record is rejected and hidden from public view
    const secondDetail = await request(`/api/projects/${secondId}`);
    assert.equal(secondDetail.status, 404);

    // Link representative to project
    const linkedRep = await request(`/api/admin/projects/${firstId}/representatives`, {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        representativeId: "rep-pune-murlidhar",
        basis: "admin-verified",
        note: "Verified constituency coverage.",
        sourceUrl: "https://sansad.in/ls/members",
      }),
    });
    assert.equal(linkedRep.status, 200);

    const updatedDetail = await request(`/api/projects/${firstId}`);
    assert.equal(updatedDetail.body.verifiedRepresentatives.length, 1);

    // GeoJSON validation: reject invalid shape, accept valid Polygon FeatureCollection
    const invalidGeo = await request("/api/admin/geo/constituencies", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({ geojson: { type: "Point", coordinates: [73.8, 18.5] } }),
    });
    assert.equal(invalidGeo.status, 400);

    const validGeo = await request("/api/admin/geo/constituencies", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        geojson: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: "Pune", house: "lok-sabha", state: "Maharashtra" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [73.7, 18.4],
                    [74.0, 18.4],
                    [74.0, 18.7],
                    [73.7, 18.7],
                    [73.7, 18.4],
                  ],
                ],
              },
            },
          ],
        },
      }),
    });
    assert.equal(validGeo.status, 200);
    assert.equal(validGeo.body.features, 1);

    const getGeo = await request("/api/geo/constituencies");
    assert.equal(getGeo.status, 200);
    assert.equal(getGeo.body.features.length, 1);

    // CSV export
    const csvExport = await request("/api/admin/export?format=csv", {
      cookie: adminCookie,
    });
    assert.equal(csvExport.status, 200);
    assert.ok(String(csvExport.body).includes("Pune Ring Road Western Corridor"));
  });

  it("supports resend-verification, project watchlist, citizen submissions, contractors filtering, admin CRUD, geo matching, and CSV round-trip", async () => {
    // 1. Register unverified user and resend verification link
    const reg = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Vikram Verma",
        email: "vikram@example.com",
        phone: "9811122233",
        password: "StrongPassword!2026",
        confirmPassword: "StrongPassword!2026",
        state: "Karnataka",
        city: "bengaluru",
        role: "citizen",
      }),
    });
    assert.equal(reg.status, 201);

    const resent = await request("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: "vikram@example.com" }),
    });
    assert.equal(resent.status, 200);
    assert.ok(resent.body.verificationUrl);

    const verifyToken = new URL(resent.body.verificationUrl).searchParams.get("token");
    const verified = await request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: verifyToken }),
    });
    assert.equal(verified.status, 200);

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "vikram@example.com",
        password: "StrongPassword!2026",
      }),
    });
    assert.equal(login.status, 200);
    const citizenCookie = login.cookie!;

    // 2. Follow & unfollow project watchlist
    const follow = await request("/api/projects/prj-atal-setu/follow", {
      method: "POST",
      cookie: citizenCookie,
    });
    assert.equal(follow.status, 200);
    assert.ok(follow.body.followedProjectIds.includes("prj-atal-setu"));

    const followedList = await request("/api/projects-followed", { cookie: citizenCookie });
    assert.equal(followedList.status, 200);
    assert.ok(followedList.body.projects.some((p: { id: string }) => p.id === "prj-atal-setu"));

    const unfollow = await request("/api/projects/prj-atal-setu/follow", {
      method: "DELETE",
      cookie: citizenCookie,
    });
    assert.equal(unfollow.status, 200);
    assert.ok(!unfollow.body.followedProjectIds.includes("prj-atal-setu"));

    // 3. Citizen project submission
    const submission = await request("/api/submissions/projects", {
      method: "POST",
      cookie: citizenCookie,
      body: JSON.stringify({
        name: "Hebbal Flyover Ramp Widening",
        state: "Karnataka",
        city: "Bengaluru",
        category: "bridges",
        status: "ongoing",
        description: "Additional loop ramps under construction by BDA to ease airport corridor congestion.",
        executingDepartment: "Bangalore Development Authority (BDA)",
        approvedBudgetCrore: 225,
        sourceOrganisation: "Bangalore Development Authority",
        sourceUrl: "https://bdabangalore.org/hebbal-ramp",
      }),
    });
    assert.equal(submission.status, 201);
    assert.equal(submission.body.project.dataClass, "user-submitted");
    assert.equal(submission.body.project.verificationStatus, "under-review");
    assert.equal(submission.body.project.approvedBudget, 2_250_000_000);

    // 4. Contractors endpoint excludes demo projects by default
    const contractors = await request("/api/contractors");
    assert.equal(contractors.status, 200);
    assert.ok(contractors.body.contractors.length > 0);
    assert.ok(
      contractors.body.contractors.every((c: { projects: { id: string }[] }) =>
        c.projects.every((p) => !p.id.startsWith("demo-")),
      ),
    );

    // 5. Admin manual project creation, funding/responsibility patch, docs, unlink rep, geo match, rep CRUD
    const adminLogin = await request("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
    });
    const adminCookie = adminLogin.cookie!;

    const created = await request("/api/admin/projects", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        name: "Pune Multimodal Transit Hub Phase I",
        state: "Maharashtra",
        city: "Pune",
        category: "roads",
        status: "ongoing",
        sourceOrganisation: "PMRDA",
        sourceUrl: "https://pmrda.gov.in/transit-hub",
        approvedBudget: 12_000_000_000,
        lat: 18.5289,
        lng: 73.8475,
        coordinatesVerified: true,
        verificationStatus: "published",
      }),
    });
    assert.equal(created.status, 201);
    const createdId = created.body.project.id as string;

    const patchedFunding = await request(`/api/admin/projects/${createdId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({
        funding: { state: 12_000_000_000, notes: "State agency funded." },
        responsibility: { sanctioningAuthority: "Government of Maharashtra" },
      }),
    });
    assert.equal(patchedFunding.status, 200);
    assert.equal(patchedFunding.body.project.funding.state, 12_000_000_000);
    assert.equal(
      patchedFunding.body.project.responsibility.sanctioningAuthority,
      "Government of Maharashtra",
    );

    const addedDoc = await request(`/api/admin/projects/${createdId}/documents`, {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        title: "CIDCO Tender Notice",
        kind: "tender",
        url: "https://cidco.maharashtra.gov.in/tender-01",
      }),
    });
    assert.equal(addedDoc.status, 201);
    const docId = addedDoc.body.document.id as string;

    const removedDoc = await request(`/api/admin/projects/${createdId}/documents/${docId}`, {
      method: "DELETE",
      cookie: adminCookie,
    });
    assert.equal(removedDoc.status, 200);
    assert.ok(!removedDoc.body.project.documents.some((d: { id: string }) => d.id === docId));

    // Geo point-in-polygon batch matching
    const geoMatched = await request("/api/admin/geo/match-projects", {
      method: "POST",
      cookie: adminCookie,
    });
    assert.equal(geoMatched.status, 200);
    assert.ok(geoMatched.body.matchedProjects >= 1);
    assert.ok(geoMatched.body.newLinks >= 1);

    // Unlink matched rep from created project
    const createdAfterMatch = await request(`/api/projects/${createdId}`);
    assert.ok(createdAfterMatch.body.verifiedRepresentatives.length >= 1);
    const linkedRepId = createdAfterMatch.body.verifiedRepresentatives[0].representativeId as string;

    const unlinked = await request(
      `/api/admin/projects/${createdId}/representatives/${linkedRepId}`,
      { method: "DELETE", cookie: adminCookie },
    );
    assert.equal(unlinked.status, 200);
    assert.equal(unlinked.body.project.representatives.length, 0);

    // Admin representative create & verify
    const createdRep = await request("/api/admin/representatives", {
      method: "POST",
      cookie: adminCookie,
      body: JSON.stringify({
        name: "Test MLA Representative",
        role: "mla",
        house: "vidhan-sabha",
        position: "Member of Legislative Assembly",
        constituency: "Worli",
        state: "Maharashtra",
        city: "Mumbai",
        party: "Independent",
        sourceOrganisation: "Election Commission of India",
        sourceUrl: "https://results.eci.gov.in/",
        verification: "unverified",
      }),
    });
    assert.equal(createdRep.status, 201);
    const newRepId = createdRep.body.representative.id as string;

    const verifiedRep = await request(`/api/admin/representatives/${newRepId}`, {
      method: "PATCH",
      cookie: adminCookie,
      body: JSON.stringify({ verification: "verified" }),
    });
    assert.equal(verifiedRep.status, 200);
    assert.equal(verifiedRep.body.representative.verification, "verified");

    // 6. CSV export -> re-import round-trip preserves approvedBudget with 0 currency warnings
    const exported = await request(`/api/projects-export?ids=${createdId}&format=csv`);
    assert.equal(exported.status, 200);
    assert.ok(String(exported.body).includes("approved_cost_inr"));

    const roundTripForm = new FormData();
    roundTripForm.append(
      "file",
      new Blob([String(exported.body)], { type: "text/csv" }),
      "roundtrip.csv",
    );
    roundTripForm.append("sourceOrganisation", "Roundtrip Test");
    roundTripForm.append("dataClass", "imported");

    const reimported = await request("/api/admin/import", {
      method: "POST",
      cookie: adminCookie,
      body: roundTripForm,
    });
    assert.equal(reimported.status, 201);
    assert.equal(reimported.body.job.errors.length, 0);
    const reimportedId = reimported.body.outcome.projectIds[0] as string;
    const reimportedDetail = await request(`/api/projects/${reimportedId}`);
    assert.equal(reimportedDetail.body.project.approvedBudget, 12_000_000_000);
  });
});
