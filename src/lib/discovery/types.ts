export interface BusinessSearchParams {
  country: string;
  city?: string;
  province?: string;
  postalCode?: string;
  zone?: string;
  category: string;
  sector?: string;
  language?: string;
  maxResults: number;
}

export interface DiscoveredBusiness {
  externalId: string;
  provider: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  googlePlaceId?: string;
  rawPayload: unknown;
}

export interface BusinessSourceProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  search(params: BusinessSearchParams): Promise<DiscoveredBusiness[]>;
}
