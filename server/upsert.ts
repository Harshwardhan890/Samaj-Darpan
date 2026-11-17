import type { Project } from "../src/shared/types";
import { getDb, saveDb } from "./db";

export interface UpsertOutcome {
  created: number;
  updated: number;
  skipped: number;
  duplicateCandidates: { id: string; existingId: string; name: string }[];
  projectIds: string[];
}

function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Insert or refresh projects without creating duplicates.
 * A record is the same when it shares a source organisation + source
 * identifier, or an identical normalised name within the same city.
 */
export function upsertProjects(incoming: Project[]): UpsertOutcome {
  const database = getDb();
  const outcome: UpsertOutcome = {
    created: 0,
    updated: 0,
    skipped: 0,
    duplicateCandidates: [],
    projectIds: [],
  };

  for (const candidate of incoming) {
    const bySource = candidate.sourceId
      ? database.projects.find(
          (p) =>
            p.sourceId === candidate.sourceId &&
            p.sourceOrganisation === candidate.sourceOrganisation &&
            p.dataClass !== "demonstration" &&
            p.verificationStatus !== "rejected",
        )
      : undefined;

    if (bySource) {
      // Refresh values that the source publishes; never blank out known data.
      const merged: Project = {
        ...bySource,
        ...Object.fromEntries(
          Object.entries(candidate).filter(([, value]) => {
            if (value === null || value === undefined) return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
          }),
        ),
        id: bySource.id,
        verificationStatus: bySource.verificationStatus,
        dataClass: bySource.dataClass,
        lastUpdated: new Date().toISOString(),
        retrievedAt: candidate.retrievedAt,
      };
      const index = database.projects.findIndex((p) => p.id === bySource.id);
      database.projects[index] = merged;
      outcome.updated += 1;
      outcome.projectIds.push(bySource.id);
      continue;
    }

    const duplicate = database.projects.find(
      (p) =>
        p.dataClass !== "demonstration" &&
        p.verificationStatus !== "rejected" &&
        normaliseName(p.name) === normaliseName(candidate.name) &&
        (p.citySlug ?? p.stateSlug) === (candidate.citySlug ?? candidate.stateSlug),
    );
    if (duplicate) {
      outcome.duplicateCandidates.push({
        id: candidate.id,
        existingId: duplicate.id,
        name: candidate.name,
      });
    }

    database.projects.push(candidate);
    outcome.created += 1;
    outcome.projectIds.push(candidate.id);
  }

  saveDb();
  return outcome;
}
