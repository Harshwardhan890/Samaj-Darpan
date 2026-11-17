import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, Circle } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Project, ProjectStatus } from "@shared/types";
import { STATUS_LABELS } from "@shared/format";

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  planned: "#8b98a2",
  ongoing: "#149a97",
  completed: "#15803d",
  delayed: "#d97706",
  stalled: "#b42318",
  unknown: "#8b98a2",
};

export function projectMarkerIcon(project: Project): L.DivIcon {
  const demo = project.dataClass === "demonstration";
  const color = demo ? "#c9a227" : STATUS_COLORS[project.status];
  return L.divIcon({
    className: "sd-marker",
    html: `<div class="sd-marker-pin ${demo ? "sd-marker-demo" : ""}" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export function ProjectMap({
  project,
  height = 380,
  interactive = true,
}: {
  project: Project;
  height?: number;
  interactive?: boolean;
}) {
  if (project.lat === null || project.lng === null) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-navy-900/10" style={{ height }}>
      <MapContainer
        center={[project.lat, project.lng]}
        zoom={14}
        scrollWheelZoom={interactive}
        dragging={interactive}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[project.lat, project.lng]}
          radius={350}
          pathOptions={{
            color: STATUS_COLORS[project.status],
            fillOpacity: 0.08,
            weight: 1,
          }}
        />
        <Marker position={[project.lat, project.lng]} icon={projectMarkerIcon(project)}>
          <Popup>
            <div className="min-w-[190px]">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-teal-700">
                {project.city ?? project.state}
              </p>
              <p className="mt-0.5 text-[12px] font-bold leading-snug text-navy-900">
                {project.name}
              </p>
              <p className="mt-1 text-[10px] text-ink-500">
                {STATUS_LABELS[project.status]} · {project.coordinatesVerified ? "Coordinate from source" : "Coordinate not verified"}
              </p>
              <Link to={`/projects/${project.id}`} className="mt-1.5 inline-block text-[10px] font-bold text-teal-700">
                Open project →
              </Link>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export function StaticMap({
  lat,
  lng,
  zoom = 12,
  height = 320,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-navy-900/10" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        dragging
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}
