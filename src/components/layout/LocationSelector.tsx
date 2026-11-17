import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "lucide-react";
import {
  ALL_INDIA,
  CITY_ZONES,
  CITIES,
  POPULAR_CITIES,
  searchCities,
  type City,
} from "@shared/cities";
import { useCity } from "@/context/CityContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/components/ui";

export function LocationSelector({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { city, selectCity, recentCities, detectLocation, clearRecent } = useCity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => searchCities(query), [query]);
  const grouped = useMemo(() => {
    if (query.trim()) return null;
    return CITY_ZONES.map((zone) => ({
      zone,
      cities: CITIES.filter((c) => c.zone === zone),
    }));
  }, [query]);

  const choose = (next: City | null) => {
    selectCity(next);
    setOpen(false);
    navigate(next ? `/cities/${next.stateSlug}/${next.slug}` : "/");
  };

  const detect = async () => {
    setDetecting(true);
    try {
      const match = await detectLocation();
      toast.push(`Location detected: ${match.name}`, {
        description: "Set as your active city. You can change it anytime.",
        tone: "success",
      });
      setOpen(false);
      navigate(`/cities/${match.stateSlug}/${match.slug}`);
    } catch (error) {
      toast.push("Could not detect your location", {
        description:
          error instanceof Error && error.name === "GeolocationPositionError"
            ? "Check your browser location permission."
            : "Choose a city from the list instead.",
        tone: "warning",
      });
    } finally {
      setDetecting(false);
    }
  };

  const isDark = variant === "dark";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition",
          isDark
            ? "border-white/15 bg-white/5 hover:bg-white/10"
            : "border-navy-900/12 bg-white hover:border-teal-500/40 hover:bg-cream-50",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            isDark ? "bg-teal-400/15 text-teal-400" : "bg-teal-50 text-teal-600",
          )}
        >
          <MapPin size={15} />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[9px] font-bold uppercase tracking-[0.16em]",
              isDark ? "text-cream-50/50" : "text-ink-400",
            )}
          >
            Location
          </span>
          <span
            className={cn(
              "flex max-w-[130px] items-center gap-1 truncate text-[13px] font-bold leading-tight",
              isDark ? "text-cream-50" : "text-navy-900",
            )}
          >
            {city?.name ?? "All India"}
            <ChevronDown
              size={13}
              className={cn(
                "shrink-0 transition",
                open && "rotate-180",
                isDark ? "text-cream-50/50" : "text-ink-400",
              )}
            />
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Select a location"
          className="animate-scale-in absolute left-0 z-50 mt-2 w-[min(92vw,430px)] overflow-hidden rounded-xl border border-navy-900/12 bg-white shadow-lift sm:left-auto sm:right-0"
        >
          <div className="border-b hairline p-3">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search city or state…"
                className="input !py-2.5 !pl-9 !pr-8 !text-sm"
                aria-label="Search city or state"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-navy-900"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => choose(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold transition",
                  !city
                    ? "border-teal-500/40 bg-teal-50 text-teal-700"
                    : "border-navy-900/10 text-ink-600 hover:bg-cream-50",
                )}
              >
                <Globe2 size={12} /> All India
              </button>
              <button
                type="button"
                onClick={detect}
                disabled={detecting}
                className="inline-flex items-center gap-1.5 rounded-md border border-navy-900/10 px-2 py-1 text-[11px] font-bold text-ink-600 transition hover:bg-cream-50 disabled:opacity-50"
              >
                <LocateFixed size={12} className={detecting ? "animate-spin" : ""} />
                {detecting ? "Detecting…" : "Detect my location"}
              </button>
            </div>
          </div>

          <div className="max-h-[min(62vh,470px)] overflow-y-auto p-2">
            {query.trim() ? (
              results.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-semibold text-navy-900">No city found</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Try a city or state name, for example “Jaipur” or “Kerala”.
                  </p>
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {results.map((result) => (
                    <CityRow
                      key={result.id}
                      city={result}
                      selected={city?.id === result.id}
                      onSelect={() => choose(result)}
                    />
                  ))}
                </ul>
              )
            ) : (
              <>
                {recentCities.length > 0 ? (
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-2 py-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                        Recently selected
                      </p>
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-[10px] font-semibold text-ink-400 hover:text-navy-900"
                      >
                        Clear
                      </button>
                    </div>
                    {recentCities.map((recent) => (
                      <CityRow
                        key={`recent-${recent.id}`}
                        city={recent}
                        selected={city?.id === recent.id}
                        onSelect={() => choose(recent)}
                        icon={<Clock3 size={12} />}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Popular cities
                  </p>
                  <div className="flex flex-wrap gap-1.5 px-1 py-1">
                    {POPULAR_CITIES.map((popular) => (
                      <button
                        key={popular.id}
                        type="button"
                        onClick={() => choose(popular)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                          city?.id === popular.id
                            ? "border-teal-500/50 bg-teal-50 text-teal-700"
                            : "border-navy-900/10 text-ink-700 hover:border-teal-500/40 hover:bg-teal-50/50",
                        )}
                      >
                        {popular.name}
                      </button>
                    ))}
                  </div>
                </div>

                {grouped?.map((group) => (
                  <div key={group.zone} className="mb-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                      {group.zone} India
                    </p>
                    <ul className="space-y-0.5">
                      {group.cities.map((result) => (
                        <CityRow
                          key={result.id}
                          city={result}
                          selected={city?.id === result.id}
                          onSelect={() => choose(result)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="border-t hairline bg-cream-50 px-3.5 py-2 text-[10.5px] text-ink-500">
            {CITIES.length} cities · Selected location filters projects, map, statistics and
            representatives.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CityRow({
  city,
  selected,
  onSelect,
  icon,
}: {
  city: City;
  selected: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
          selected ? "bg-teal-50" : "hover:bg-cream-100",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]",
            selected ? "bg-teal-600 text-white" : "bg-cream-100 text-ink-500",
          )}
        >
          {selected ? <Check size={12} /> : icon ?? <MapPin size={11} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-navy-900">
            {city.name}
          </span>
          <span className="block truncate text-[10.5px] text-ink-400">{city.state}</span>
        </span>
        {ALL_INDIA.id === city.id ? (
          <span className="text-[10px] font-bold text-ink-400">National</span>
        ) : null}
      </button>
    </li>
  );
}
