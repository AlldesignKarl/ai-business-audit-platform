import { getEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { BusinessSearchParams, BusinessSourceProvider, DiscoveredBusiness } from "@/lib/discovery/types";

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.businessStatus",
  "nextPageToken",
].join(",");

interface PlacesApiPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  businessStatus?: string;
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
  nextPageToken?: string;
}

/**
 * Conector real sobre la Places API (New) de Google. Queda completamente
 * deshabilitado (isConfigured=false) si no hay GOOGLE_PLACES_API_KEY — nunca
 * genera resultados simulados. Aplica rate limiting propio por si Google
 * limita la cuenta, independientemente de las cuotas de Google.
 */
export class GooglePlacesProvider implements BusinessSourceProvider {
  readonly name = "google_places";
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async search(params: BusinessSearchParams): Promise<DiscoveredBusiness[]> {
    if (!this.apiKey) {
      throw new Error("GooglePlacesProvider no está configurado (falta GOOGLE_PLACES_API_KEY)");
    }

    const locationText = [params.category, params.zone, params.city, params.province, params.country].filter(Boolean).join(" en ");
    const results: DiscoveredBusiness[] = [];
    let pageToken: string | undefined;
    const pageSize = 20;

    while (results.length < params.maxResults) {
      const rate = await checkRateLimit("provider:google_places", 100, 60);
      if (!rate.allowed) {
        throw new Error(`Límite de tasa de Google Places alcanzado, reintenta en ${rate.resetInSeconds}s`);
      }

      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: locationText,
          languageCode: params.language ?? "es",
          maxResultCount: Math.min(pageSize, params.maxResults - results.length),
          ...(pageToken ? { pageToken } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Google Places API error ${res.status}: ${body}`);
      }

      const data = (await res.json()) as PlacesApiResponse;
      for (const place of data.places ?? []) {
        results.push(mapPlaceToDiscoveredBusiness(place, params));
      }

      if (!data.nextPageToken || (data.places?.length ?? 0) === 0) break;
      pageToken = data.nextPageToken;
      // Google requiere una breve espera antes de que el nextPageToken sea válido.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results.slice(0, params.maxResults);
  }
}

function mapPlaceToDiscoveredBusiness(place: PlacesApiPlace, params: BusinessSearchParams): DiscoveredBusiness {
  const cityComponent = place.addressComponents?.find((c) => c.types.includes("locality"));
  const postalComponent = place.addressComponents?.find((c) => c.types.includes("postal_code"));
  const countryComponent = place.addressComponents?.find((c) => c.types.includes("country"));

  return {
    externalId: place.id,
    provider: "google_places",
    name: place.displayName?.text ?? "Negocio sin nombre",
    category: place.primaryType ?? params.category,
    address: place.formattedAddress,
    city: cityComponent?.longText ?? params.city,
    country: countryComponent?.longText ?? params.country,
    postalCode: postalComponent?.longText ?? params.postalCode,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    website: place.websiteUri,
    phone: place.internationalPhoneNumber,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    googlePlaceId: place.id,
    rawPayload: place,
  };
}
