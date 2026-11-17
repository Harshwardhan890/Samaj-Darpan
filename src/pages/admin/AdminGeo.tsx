import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileJson,
  Map as MapIcon,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  Badge,
  Button,
  PageHeader,
  cn,
} from "@/components/ui";
import { useToast } from "@/context/ToastContext";
import { useApiData } from "@/hooks/useApiData";
import { ApiError, apiFetch } from "@/services/api";

interface ConstituencyCollection {
  type: string;
  features?: {
    type?: string;
    properties?: Record<string, unknown> | null;
    geometry?: { type?: string } | null;
  }[];
}

interface GeoResponse {
  type: string;
  features: unknown[];
}

export default function AdminGeoPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ features: number } | null>(null);

  const status = useApiData<GeoResponse>("/geo/constituencies");

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as ConstituencyCollection;
    } catch {
      return null;
    }
  }, [text]);

  const featureCount = Array.isArray(parsed?.features) ? parsed.features.length : 0;
  const parseError = text.trim() && !parsed;
  const invalidShape =
    parsed !== null &&
    (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features));

  const readFile = async (file: File | null) => {
    setError(null);
    setSaved(null);
    if (!file) return;
    if (!/\.(geojson|json)$/i.test(file.name)) {
      setError("Choose a .geojson or .json file containing a GeoJSON FeatureCollection.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("The boundary file must be 8 MB or smaller.");
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      setFileName(file.name);
    } catch {
      setError("The file could not be read.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(null);
    if (!parsed) {
      setError("Paste valid GeoJSON first, or choose a file.");
      return;
    }
    if (invalidShape) {
      setError(
        "The document must be a GeoJSON FeatureCollection with a features array.",
      );
      return;
    }
    if (featureCount === 0) {
      setError("The FeatureCollection contains no features.");
      return;
    }
    const badGeometry = parsed.features?.find(
      (feature) =>
        !feature.geometry ||
        (feature.geometry.type !== "Polygon" &&
          feature.geometry.type !== "MultiPolygon"),
    );
    if (badGeometry) {
      setError(
        "Every feature must carry a Polygon or MultiPolygon geometry. Point or line boundaries are not accepted.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch<{
        ok: boolean;
        updatedAt: string;
        features: number;
      }>("/admin/geo/constituencies", {
        method: "POST",
        body: JSON.stringify({ geojson: parsed }),
      });
      setSaved({ features: response.features });
      status.refresh();
      toast.push("Boundary dataset stored", {
        description: `${response.features} features saved. Matching is still subject to administrator verification.`,
        tone: "success",
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The boundary dataset could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · geography"
        title="Constituency boundaries"
        description="Upload a GeoJSON boundary file so a point-in-polygon match can support constituency attribution. A geometric match alone does not prove political responsibility; project-level links still require administrator verification."
        actions={
          <Badge tone={status.data ? "teal" : "neutral"}>
            <MapIcon size={11} />
            {status.data ? `${status.data.features?.length ?? 0} features loaded` : "No dataset"}
          </Badge>
        }
      />

      <section className="card p-5">
        <h2 className="font-display text-xl">Current dataset</h2>
        <p className="mt-0.5 text-[11px] text-ink-400">
          The public project pages only use boundaries for context. Records are never assigned
          to a representative on the basis of a boundary alone.
        </p>
        {status.loading ? (
          <p className="mt-3 text-[11.5px] text-ink-400">Checking stored boundaries…</p>
        ) : status.data ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-teal-500/25 bg-teal-50/60 px-3 py-2 text-[11px] text-teal-800">
            <CheckCircle2 size={14} />
            Boundary dataset present · {status.data.features?.length ?? 0} features · loaded from
            the administrator store.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-navy-900/10 bg-cream-50 px-3 py-2 text-[11px] text-ink-500">
            <AlertCircle size={14} className="text-amber-600" />
            {status.error ??
              "No constituency boundary dataset is configured. Constituency attribution remains “not verified” until one is uploaded and checked."}
          </div>
        )}
      </section>

      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-xl">Upload a boundary file</h2>
          <p className="mt-1 text-[11px] text-ink-400">
            GeoJSON only. Every feature must have a Polygon or MultiPolygon geometry and
            should carry a constituency name and house in its properties.
          </p>

          <div
            className="mt-4 rounded-xl border-2 border-dashed border-navy-900/15 bg-cream-50/60 px-5 py-6 text-center transition hover:border-teal-500/40"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void readFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <UploadCloud size={26} className="mx-auto text-teal-600" />
            <p className="mt-2 text-[12.5px] font-bold text-navy-900">
              Drop a .geojson file here, or browse
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">
              Nothing is stored until you save the dataset.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileRef.current?.click()}
              icon={<FileJson size={13} />}
            >
              Browse files
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              className="hidden"
              onChange={(event) => void readFile(event.target.files?.[0] ?? null)}
            />
            {fileName ? (
              <p className="mt-2 text-[10.5px] font-semibold text-ink-600">
                Loaded from {fileName}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="geojson" className="field-label">
              Or paste GeoJSON
            </label>
            <textarea
              id="geojson"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFileName(null);
                setSaved(null);
              }}
              spellCheck={false}
              placeholder='{"type":"FeatureCollection","features":[…]}'
              className="input min-h-[220px] font-mono !text-[11px]"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
              {parseError ? (
                <span className="text-red-700">Not valid JSON.</span>
              ) : parsed ? (
                <span className={cn(invalidShape ? "text-red-700" : "text-teal-700")}>
                  {invalidShape
                    ? "Parsed, but this is not a FeatureCollection."
                    : `Parsed ${featureCount} feature${featureCount === 1 ? "" : "s"}.`}
                </span>
              ) : (
                <span className="text-ink-400">Paste a FeatureCollection or load a file.</span>
              )}
              <span className="ml-auto text-ink-400">
                {(new Blob([text]).size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>

          {error ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : null}

          {saved ? (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-teal-500/25 bg-teal-50/70 px-3 py-2 text-[11px] text-teal-800">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              Saved {saved.features} features. The dataset is now available to the
              constituency matching view.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              loading={submitting}
              disabled={!parsed || invalidShape || featureCount === 0}
              icon={<ShieldCheck size={14} />}
            >
              Save boundary dataset
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setText("");
                setFileName(null);
                setError(null);
                setSaved(null);
              }}
            >
              Clear
            </Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="font-display text-lg">Expected format</h2>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">
              A standard GeoJSON FeatureCollection. A minimal feature looks like this:
            </p>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-navy-900/10 bg-navy-950 p-3 text-[9.5px] leading-relaxed text-cream-50/80">
{`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Example constituency",
        "house": "lok-sabha",
        "state": "Example state"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.8, 19.0],
          [72.9, 19.0], [72.9, 19.1],
          [72.8, 19.1], [72.8, 19.0]]]
      }
    }
  ]
}`}
            </pre>
          </section>

          <section className="card p-5">
            <h2 className="font-display text-lg">Rules</h2>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-ink-500">
              <li>
                <strong className="text-navy-900">No inferred responsibility.</strong> A point
                inside a polygon identifies the constituency area, not who approved or funded
                the project.
              </li>
              <li>
                <strong className="text-navy-900">Verify the source.</strong> Boundary files
                must come from an official delimitation or election authority publication.
              </li>
              <li>
                <strong className="text-navy-900">Coordinates stay honest.</strong> A boundary
                file never supplies project coordinates. Those must be published per project.
              </li>
              <li>
                <strong className="text-navy-900">One dataset at a time.</strong> Saving a new
                FeatureCollection replaces the stored boundary file for the whole platform.
              </li>
            </ul>
          </section>
        </aside>
      </form>
    </div>
  );
}
