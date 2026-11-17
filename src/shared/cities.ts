import type { City, CityZone } from "./types";

export type { City, CityZone };

/**
 * City registry.
 *
 * Coordinates are city-centre approximations used only to frame the map.
 * Project coordinates are never derived from these — a project marker is
 * plotted only when the source record itself publishes a location.
 */
export const CITIES: City[] = [
  // ── NORTH ──────────────────────────────────────────────────────────────
  { id: "delhi", name: "Delhi", slug: "new-delhi", state: "Delhi", stateSlug: "delhi", zone: "North", lat: 28.6139, lng: 77.209, popular: true, aliases: ["new delhi", "ncr", "delhi ncr"] },
  { id: "gurugram", name: "Gurugram", slug: "gurugram", state: "Haryana", stateSlug: "haryana", zone: "North", lat: 28.4595, lng: 77.0266, popular: true, aliases: ["gurgaon"] },
  { id: "faridabad", name: "Faridabad", slug: "faridabad", state: "Haryana", stateSlug: "haryana", zone: "North", lat: 28.4089, lng: 77.3178 },
  { id: "noida", name: "Noida", slug: "noida", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", zone: "North", lat: 28.5355, lng: 77.391, popular: true, aliases: ["greater noida", "gautam budh nagar", "gautam buddha nagar"] },
  { id: "ghaziabad", name: "Ghaziabad", slug: "ghaziabad", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", zone: "North", lat: 28.6692, lng: 77.4538 },
  { id: "chandigarh", name: "Chandigarh", slug: "chandigarh", state: "Chandigarh", stateSlug: "chandigarh", zone: "North", lat: 30.7333, lng: 76.7794 },
  { id: "jaipur", name: "Jaipur", slug: "jaipur", state: "Rajasthan", stateSlug: "rajasthan", zone: "North", lat: 26.9124, lng: 75.7873, popular: true },
  { id: "lucknow", name: "Lucknow", slug: "lucknow", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", zone: "North", lat: 26.8467, lng: 80.9462 },
  { id: "kanpur", name: "Kanpur", slug: "kanpur", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", zone: "North", lat: 26.4499, lng: 80.3319, aliases: ["kanpur nagar"] },
  { id: "dehradun", name: "Dehradun", slug: "dehradun", state: "Uttarakhand", stateSlug: "uttarakhand", zone: "North", lat: 30.3165, lng: 78.0322 },
  { id: "amritsar", name: "Amritsar", slug: "amritsar", state: "Punjab", stateSlug: "punjab", zone: "North", lat: 31.634, lng: 74.8723 },
  { id: "ludhiana", name: "Ludhiana", slug: "ludhiana", state: "Punjab", stateSlug: "punjab", zone: "North", lat: 30.901, lng: 75.8573 },
  { id: "jammu", name: "Jammu", slug: "jammu", state: "Jammu and Kashmir", stateSlug: "jammu-and-kashmir", zone: "North", lat: 32.7266, lng: 74.857 },
  { id: "srinagar", name: "Srinagar", slug: "srinagar", state: "Jammu and Kashmir", stateSlug: "jammu-and-kashmir", zone: "North", lat: 34.0837, lng: 74.7973 },

  // ── WEST ───────────────────────────────────────────────────────────────
  { id: "mumbai", name: "Mumbai", slug: "mumbai", state: "Maharashtra", stateSlug: "maharashtra", zone: "West", lat: 19.076, lng: 72.8777, popular: true, aliases: ["bombay", "navi mumbai", "mmr"] },
  { id: "pune", name: "Pune", slug: "pune", state: "Maharashtra", stateSlug: "maharashtra", zone: "West", lat: 18.5204, lng: 73.8567, popular: true },
  { id: "nagpur", name: "Nagpur", slug: "nagpur", state: "Maharashtra", stateSlug: "maharashtra", zone: "West", lat: 21.1458, lng: 79.0882 },
  { id: "nashik", name: "Nashik", slug: "nashik", state: "Maharashtra", stateSlug: "maharashtra", zone: "West", lat: 19.9975, lng: 73.7898, aliases: ["nasik"] },
  { id: "ahmedabad", name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat", stateSlug: "gujarat", zone: "West", lat: 23.0225, lng: 72.5714, popular: true },
  { id: "surat", name: "Surat", slug: "surat", state: "Gujarat", stateSlug: "gujarat", zone: "West", lat: 21.1702, lng: 72.8311 },
  { id: "vadodara", name: "Vadodara", slug: "vadodara", state: "Gujarat", stateSlug: "gujarat", zone: "West", lat: 22.3072, lng: 73.1812, aliases: ["baroda"] },
  { id: "rajkot", name: "Rajkot", slug: "rajkot", state: "Gujarat", stateSlug: "gujarat", zone: "West", lat: 22.3039, lng: 70.8022 },
  { id: "indore", name: "Indore", slug: "indore", state: "Madhya Pradesh", stateSlug: "madhya-pradesh", zone: "West", lat: 22.7196, lng: 75.8577, popular: true },
  { id: "bhopal", name: "Bhopal", slug: "bhopal", state: "Madhya Pradesh", stateSlug: "madhya-pradesh", zone: "West", lat: 23.2599, lng: 77.4126 },

  // ── SOUTH ──────────────────────────────────────────────────────────────
  { id: "bengaluru", name: "Bengaluru", slug: "bengaluru", state: "Karnataka", stateSlug: "karnataka", zone: "South", lat: 12.9716, lng: 77.5946, popular: true, aliases: ["bangalore"] },
  { id: "chennai", name: "Chennai", slug: "chennai", state: "Tamil Nadu", stateSlug: "tamil-nadu", zone: "South", lat: 13.0827, lng: 80.2707, popular: true, aliases: ["madras"] },
  { id: "hyderabad", name: "Hyderabad", slug: "hyderabad", state: "Telangana", stateSlug: "telangana", zone: "South", lat: 17.385, lng: 78.4867, popular: true, aliases: ["secunderabad"] },
  { id: "kochi", name: "Kochi", slug: "kochi", state: "Kerala", stateSlug: "kerala", zone: "South", lat: 9.9312, lng: 76.2673, aliases: ["cochin", "ernakulam"] },
  { id: "thiruvananthapuram", name: "Thiruvananthapuram", slug: "thiruvananthapuram", state: "Kerala", stateSlug: "kerala", zone: "South", lat: 8.5241, lng: 76.9366, aliases: ["trivandrum"] },
  { id: "coimbatore", name: "Coimbatore", slug: "coimbatore", state: "Tamil Nadu", stateSlug: "tamil-nadu", zone: "South", lat: 11.0168, lng: 76.9558 },
  { id: "mysuru", name: "Mysuru", slug: "mysuru", state: "Karnataka", stateSlug: "karnataka", zone: "South", lat: 12.2958, lng: 76.6394, aliases: ["mysore"] },
  { id: "visakhapatnam", name: "Visakhapatnam", slug: "visakhapatnam", state: "Andhra Pradesh", stateSlug: "andhra-pradesh", zone: "South", lat: 17.6868, lng: 83.2185, aliases: ["vizag"] },
  { id: "vijayawada", name: "Vijayawada", slug: "vijayawada", state: "Andhra Pradesh", stateSlug: "andhra-pradesh", zone: "South", lat: 16.5062, lng: 80.648 },

  // ── EAST & CENTRAL ─────────────────────────────────────────────────────
  { id: "kolkata", name: "Kolkata", slug: "kolkata", state: "West Bengal", stateSlug: "west-bengal", zone: "East & Central", lat: 22.5726, lng: 88.3639, popular: true, aliases: ["calcutta"] },
  { id: "bhubaneswar", name: "Bhubaneswar", slug: "bhubaneswar", state: "Odisha", stateSlug: "odisha", zone: "East & Central", lat: 20.2961, lng: 85.8245 },
  { id: "patna", name: "Patna", slug: "patna", state: "Bihar", stateSlug: "bihar", zone: "East & Central", lat: 25.5941, lng: 85.1376 },
  { id: "ranchi", name: "Ranchi", slug: "ranchi", state: "Jharkhand", stateSlug: "jharkhand", zone: "East & Central", lat: 23.3441, lng: 85.3096 },
  { id: "guwahati", name: "Guwahati", slug: "guwahati", state: "Assam", stateSlug: "assam", zone: "East & Central", lat: 26.1445, lng: 91.7362 },
  { id: "raipur", name: "Raipur", slug: "raipur", state: "Chhattisgarh", stateSlug: "chhattisgarh", zone: "East & Central", lat: 21.2514, lng: 81.6296 },
  { id: "jabalpur", name: "Jabalpur", slug: "jabalpur", state: "Madhya Pradesh", stateSlug: "madhya-pradesh", zone: "East & Central", lat: 23.1815, lng: 79.9864 },
];

export const ALL_INDIA: City = {
  id: "india",
  name: "India",
  slug: "india",
  state: "India",
  stateSlug: "india",
  zone: "North",
  lat: 22.5,
  lng: 79.5,
  aliases: ["all india", "national", "bharat"],
};

export const CITY_ZONES: CityZone[] = ["North", "West", "South", "East & Central"];

export function findCity(idOrSlug: string | null | undefined): City | undefined {
  if (!idOrSlug) return undefined;
  if (idOrSlug === "india") return ALL_INDIA;
  const needle = idOrSlug.toLowerCase();
  return CITIES.find(
    (c) =>
      c.id === needle ||
      c.slug === needle ||
      c.stateSlug === needle ||
      c.aliases?.includes(needle),
  );
}

export function findCityByRoute(stateSlug: string, citySlug: string): City | undefined {
  return CITIES.find(
    (c) =>
      c.stateSlug === stateSlug.toLowerCase() &&
      (c.slug === citySlug.toLowerCase() || c.id === citySlug.toLowerCase()),
  );
}

export function cityBySlug(slug: string | null | undefined): City | undefined {
  if (!slug || slug === "india") return undefined;
  return CITIES.find((c) => c.slug === slug || c.id === slug);
}

export function cityLabel(city: City | null | undefined): string {
  if (!city || city.id === "india") return "All India";
  return city.name;
}

export function cityRoute(city: City | null | undefined): string {
  if (!city || city.id === "india") return "/";
  return `/cities/${city.stateSlug}/${city.slug}`;
}

/** Great-circle distance in km. Used by "detect my location". */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCity(lat: number, lng: number): City {
  let best = CITIES[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const city of CITIES) {
    const d = distanceKm({ lat, lng }, city);
    if (d < bestDistance) {
      best = city;
      bestDistance = d;
    }
  }
  return best;
}

export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES;
  return CITIES.filter((c) => {
    const haystack = [c.name, c.state, c.slug, ...(c.aliases ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export const POPULAR_CITIES = CITIES.filter((c) => c.popular);
