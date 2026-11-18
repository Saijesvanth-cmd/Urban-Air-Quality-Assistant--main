export interface GeocodedLocation {
  id: string;
  name: string;
  admin1: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezone: string;
  population?: number;
  source: 'open-meteo-geocoding' | 'browser-geolocation' | 'preset';
  areaLabel?: string;
}

export class GeocodingServiceError extends Error {
  code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR';

  constructor(
    code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'GeocodingServiceError';
    this.code = code;
  }
}

interface CacheEntry {
  expiresAt: number;
  results: GeocodedLocation[];
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function searchLocations(
  rawQuery: string,
  signal?: AbortSignal
): Promise<GeocodedLocation[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=10&language=en&format=json`;

    const resp = await fetch(url, { signal: controller.signal });
    if (resp.status === 429) {
      throw new GeocodingServiceError(
        'RATE_LIMITED',
        'Open-Meteo geocoding rate limit reached. Please pause briefly and retry.'
      );
    }
    if (!resp.ok) {
      throw new GeocodingServiceError(
        'UPSTREAM_ERROR',
        `City search service returned HTTP ${resp.status}.`
      );
    }

    let payload: {
      results?: Array<{
        id?: number;
        name?: string;
        admin1?: string;
        country?: string;
        country_code?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
        population?: number;
      }>;
    };
    try {
      payload = await resp.json();
    } catch {
      throw new GeocodingServiceError('UPSTREAM_ERROR', 'City search returned malformed data.');
    }
    if (!payload || typeof payload !== 'object' || (payload.results !== undefined && !Array.isArray(payload.results))) {
      throw new GeocodingServiceError('UPSTREAM_ERROR', 'City search returned an invalid response.');
    }

    const normalized: GeocodedLocation[] = (payload.results ?? [])
      .filter(
        (r) =>
          typeof r?.name === 'string' &&
          Number.isFinite(r.latitude) && r.latitude! >= -90 && r.latitude! <= 90 &&
          Number.isFinite(r.longitude) && r.longitude! >= -180 && r.longitude! <= 180
      )
      .map((r) => ({
        id: `om-${r.id ?? `${r.latitude?.toFixed(3)}-${r.longitude?.toFixed(3)}`}`,
        name: r.name!.trim(),
        admin1: r.admin1?.trim() || '',
        country: r.country?.trim() || r.country_code?.trim() || '',
        countryCode: r.country_code?.trim() || '',
        lat: Number(r.latitude!.toFixed(4)),
        lon: Number(r.longitude!.toFixed(4)),
        timezone: r.timezone || 'auto',
        population: typeof r.population === 'number' ? r.population : undefined,
        source: 'open-meteo-geocoding' as const,
      }));

    searchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      results: normalized,
    });

    return normalized;
  } catch (err) {
    if (err instanceof GeocodingServiceError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new GeocodingServiceError('TIMEOUT', 'City search timed out. Please retry.');
    }
    throw new GeocodingServiceError(
      'NETWORK_UNAVAILABLE',
      'Unable to reach Open-Meteo city search. Check your internet connection.'
    );
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onParentAbort);
  }
}
