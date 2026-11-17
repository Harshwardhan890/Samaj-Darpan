import type { DataConnector, ConnectorResult } from "./normalize";

const TIMEOUT_MS = 15_000;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "SamajDarpan/2.0 (civic transparency platform; contact: data@samajdarpan.in)",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function asRecords(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const records = obj.records ?? obj.data ?? obj.results;
  if (Array.isArray(records)) {
    return records.filter(
      (r): r is Record<string, unknown> => typeof r === "object" && r !== null,
    );
  }
  return [];
}

function unavailable(
  message: string,
  organisation: string,
): ConnectorResult {
  return {
    ok: false,
    projects: [],
    raw: [],
    message,
    errors: [message],
  };
}

/**
 * Open Government Data India.
 * Real API retrieval, server-side only (the key never reaches the browser).
 * Resource IDs are configured by an operator because OGD covers thousands of
 * unrelated datasets and blindly fetching the catalogue would be meaningless.
 */
export const ogdConnector: DataConnector = {
  id: "ogd",
  sourceOrganisation: "Open Government Data (OGD) India",
  homepage: "https://data.gov.in/",
  canFetch: () =>
    Boolean(process.env.OGD_API_KEY?.trim() && process.env.OGD_RESOURCE_IDS?.trim()),
  async fetchProjects({ limit = 100 } = {}) {
    const key = process.env.OGD_API_KEY?.trim();
    const resourceIds = (process.env.OGD_RESOURCE_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!key || resourceIds.length === 0) {
      return unavailable(
        "OGD is not configured. Set OGD_API_KEY and OGD_RESOURCE_IDS on the server.",
        this.sourceOrganisation,
      );
    }
    const projects: ConnectorResult["projects"] = [];
    const raw: unknown[] = [];
    const errors: string[] = [];

    const { normalizeRow } = await import("./normalize");

    for (const resourceId of resourceIds.slice(0, 5)) {
      const url = `https://api.data.gov.in/resource/${encodeURIComponent(
        resourceId,
      )}?api-key=${encodeURIComponent(key)}&format=json&limit=${Math.min(
        Math.max(limit, 1),
        500,
      )}&offset=0`;
      try {
        const payload = await fetchJson(url);
        const records = asRecords(payload);
        raw.push({ resourceId, payload });
        if (records.length === 0) {
          errors.push(`Resource ${resourceId} returned no records.`);
          continue;
        }
        for (const row of records) {
          const { project } = normalizeRow(row, {
            sourceId: `ogd:${resourceId}`,
            sourceOrganisation: this.sourceOrganisation,
            sourceUrl: `https://www.data.gov.in/resource/${resourceId}`,
            dataClass: "imported",
            retrievedAt: new Date().toISOString(),
          });
          projects.push(project);
        }
      } catch (error) {
        errors.push(
          `Resource ${resourceId}: ${
            error instanceof Error ? error.message : "request failed"
          }`,
        );
      }
    }

    return {
      ok: projects.length > 0,
      projects,
      raw,
      message:
        projects.length > 0
          ? `Retrieved ${projects.length} records from ${resourceIds.length} OGD resource(s).`
          : "No records could be retrieved from the configured OGD resources.",
      errors,
    };
  },
};

function manualConnector(
  id: string,
  organisation: string,
  homepage: string,
  reason: string,
): DataConnector {
  return {
    id,
    sourceOrganisation: organisation,
    homepage,
    canFetch: () => false,
    async fetchProjects() {
      return unavailable(reason, organisation);
    },
  };
}

export const paimanaConnector = manualConnector(
  "paimana",
  "Ministry of Statistics and Programme Implementation (PAIMANA)",
  "https://ipm.mospi.gov.in/Home/PublicDashboard",
  "PAIMANA publishes no documented public API. Use a permitted published extract and import it through Admin → Data management.",
);

export const smartCitiesConnector = manualConnector(
  "smart-cities",
  "Smart Cities Mission Data Portal",
  "https://smartcities.data.gov.in/",
  "The Smart Cities portal has no documented bulk API. Import a published CSV/XLSX extract through Admin → Data management.",
);

export const pmgsyConnector = manualConnector(
  "pmgsy",
  "PMGSY GeoSadak (Ministry of Rural Development)",
  "https://geosadak-pmgsy.nic.in/",
  "GeoSadak has no documented public API. Use permitted public downloads and the administrator import pipeline.",
);

export const procurementConnector = manualConnector(
  "eprocure",
  "Government eProcurement (CPPP)",
  "https://eprocure.gov.in/eprocure/app",
  "eProcurement restricts bulk automated access. Attach tender documents and source links from published notices; do not scrape restricted pages.",
);

export const CONNECTORS: DataConnector[] = [
  ogdConnector,
  paimanaConnector,
  smartCitiesConnector,
  pmgsyConnector,
  procurementConnector,
];

export function connectorById(id: string): DataConnector | undefined {
  return CONNECTORS.find((c) => c.id === id);
}
