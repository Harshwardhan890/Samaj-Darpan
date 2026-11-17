import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ALL_INDIA, cityBySlug, cityLabel, cityRoute, nearestCity, type City } from "@shared/cities";

const CITY_KEY = "sd.city";
const RECENT_KEY = "sd.recentCities";

interface CityContextValue {
  city: City | null;
  cityName: string;
  isAllIndia: boolean;
  recentCities: City[];
  selectCity: (city: City | null) => void;
  detectLocation: () => Promise<City>;
  clearRecent: () => void;
  scopeParams: { state?: string; city?: string };
  routeForCity: (city: City | null) => string;
}

const CityContext = createContext<CityContextValue | null>(null);

function readStoredCity(): City | null {
  try {
    const slug = localStorage.getItem(CITY_KEY);
    if (!slug || slug === "india") return null;
    return cityBySlug(slug) ?? null;
  } catch {
    return null;
  }
}

function readRecent(): City[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const slugs = JSON.parse(raw) as string[];
    return slugs
      .map((slug) => cityBySlug(slug))
      .filter((city): city is City => Boolean(city))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<City | null>(() => readStoredCity());
  const [recentCities, setRecentCities] = useState<City[]>(() => readRecent());

  const selectCity = useCallback((next: City | null) => {
    setCityState(next);
    try {
      localStorage.setItem(CITY_KEY, next ? next.slug : "india");
    } catch {
      /* storage may be unavailable in private mode */
    }
    if (next) {
      setRecentCities((previous) => {
        const updated = [next, ...previous.filter((c) => c.slug !== next.slug)].slice(0, 5);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(updated.map((c) => c.slug)));
        } catch {
          /* ignore */
        }
        return updated;
      });
    }
  }, []);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CITY_KEY) setCityState(readStoredCity());
      if (event.key === RECENT_KEY) setRecentCities(readRecent());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const detectLocation = useCallback(async (): Promise<City> => {
    if (!("geolocation" in navigator)) {
      throw new Error("Location detection is not available in this browser.");
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      });
    });
    const match = nearestCity(position.coords.latitude, position.coords.longitude);
    selectCity(match);
    return match;
  }, [selectCity]);

  const value = useMemo<CityContextValue>(
    () => ({
      city,
      cityName: cityLabel(city),
      isAllIndia: !city || city.id === ALL_INDIA.id,
      recentCities,
      selectCity,
      detectLocation,
      clearRecent: () => {
        setRecentCities([]);
        try {
          localStorage.removeItem(RECENT_KEY);
        } catch {
          /* ignore */
        }
      },
      scopeParams: city ? { state: city.stateSlug, city: city.slug } : {},
      routeForCity: cityRoute,
    }),
    [city, recentCities, selectCity, detectLocation],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const context = useContext(CityContext);
  if (!context) throw new Error("useCity must be used inside CityProvider");
  return context;
}
