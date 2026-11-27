import type { BoundaryMatch, Representative } from "../src/shared/types";

type Ring = number[][];

interface GeoGeometry {
  type?: string;
  coordinates?: unknown;
}

interface GeoFeature {
  type?: string;
  properties?: Record<string, unknown> | null;
  geometry?: GeoGeometry | null;
}

interface GeoCollection {
  type?: string;
  features?: GeoFeature[];
}

/** Ray-casting point-in-ring check. GeoJSON coordinates are [lng, lat]. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Check exterior ring and exclude interior holes. */
export function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (!Array.isArray(rings) || rings.length === 0) return false;
  if (!pointInRing(lng, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i])) return false;
  }
  return true;
}

export function pointInGeometry(
  lng: number,
  lat: number,
  geometry: GeoGeometry | null | undefined,
): boolean {
  if (!geometry || !geometry.coordinates) return false;
  if (geometry.type === "Polygon") {
    return pointInPolygon(lng, lat, geometry.coordinates as Ring[]);
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as Ring[][];
    if (!Array.isArray(polygons)) return false;
    return polygons.some((poly) => pointInPolygon(lng, lat, poly));
  }
  return false;
}

function normaliseText(value: unknown): string {
  return typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    : "";
}

export function matchPointToConstituencies(
  lat: number,
  lng: number,
  geojson: unknown,
  representatives: Representative[],
): BoundaryMatch[] {
  if (!geojson || typeof geojson !== "object") return [];
  const collection = geojson as GeoCollection;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return [];
  }

  const matches: BoundaryMatch[] = [];
  for (const feature of collection.features) {
    if (!pointInGeometry(lng, lat, feature?.geometry)) continue;
    const props = feature.properties ?? {};
    const rawName =
      props.name ?? props.pc_name ?? props.ac_name ?? props.constituency ?? null;
    const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : "Unnamed constituency";
    const house = typeof props.house === "string" ? props.house.trim() : null;
    const state = typeof props.state === "string" ? props.state.trim() : null;

    const targetName = normaliseText(name);
    const targetState = normaliseText(state);
    const rep = representatives.find((r) => {
      if (normaliseText(r.constituency) !== targetName) return false;
      if (targetState && normaliseText(r.state) !== targetState) return false;
      return true;
    });

    matches.push({
      name,
      house,
      state,
      matchedRepresentativeId: rep?.id ?? null,
      matchedRepresentativeName: rep?.name ?? null,
      party: rep?.party ?? null,
    });
  }
  return matches;
}
