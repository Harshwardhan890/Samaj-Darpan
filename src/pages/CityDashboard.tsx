import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { findCityByRoute } from "@shared/cities";
import { useCity } from "@/context/CityContext";
import DashboardPage from "./Dashboard";
import NotFoundPage from "./NotFound";

/**
 * Route wrapper for /cities/:state/:city. The URL is the source of truth for the
 * active city, so a shared dashboard link always shows that city rather than
 * whatever was last stored in localStorage.
 */
export default function CityDashboardPage() {
  const { state, city } = useParams();
  const match = state && city ? findCityByRoute(state, city) : undefined;
  const { city: activeCity, selectCity } = useCity();

  useEffect(() => {
    if (match && activeCity?.slug !== match.slug) selectCity(match);
  }, [match, activeCity?.slug, selectCity]);

  if (!match) {
    return (
      <NotFoundPage
        title="City not found"
        description={`There is no supported city at /cities/${state ?? ""}/${city ?? ""}. Use the location selector to choose one of the cities covered by Samaj Darpan.`}
      />
    );
  }

  return <DashboardPage cityOverride={match} />;
}
