import {
  fetchOpenMeteoAirQuality,
  type AirQualitySnapshot,
} from './airQualityService';
import {
  fetchOpenMeteoWeather,
  type WeatherSnapshot,
} from './weatherService';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

interface CachedPair<T> {
  expiresAt: number;
  data: T;
}

const weatherCache = new Map<string, CachedPair<WeatherSnapshot>>();
const aqCache = new Map<string, CachedPair<AirQualitySnapshot>>();

const inflightWeather = new Map<string, Promise<WeatherSnapshot>>();
const inflightAq = new Map<string, Promise<AirQualitySnapshot>>();

function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export async function getWeatherForCoordinates(
  lat: number,
  lon: number,
  options?: { forceRefresh?: boolean; signal?: AbortSignal }
): Promise<WeatherSnapshot> {
  const key = coordKey(lat, lon);

  if (!options?.forceRefresh) {
    const cached = weatherCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, isCached: true };
    }
  }

  const existing = inflightWeather.get(key);
  if (existing && !options?.forceRefresh) {
    return existing;
  }

  const promise = fetchOpenMeteoWeather(lat, lon, options?.signal)
    .then((snapshot) => {
      weatherCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: snapshot,
      });
      return snapshot;
    })
    .finally(() => {
      inflightWeather.delete(key);
    });

  inflightWeather.set(key, promise);
  return promise;
}

export async function getAirQualityForCoordinates(
  lat: number,
  lon: number,
  options?: { forceRefresh?: boolean; signal?: AbortSignal }
): Promise<AirQualitySnapshot> {
  const key = coordKey(lat, lon);

  if (!options?.forceRefresh) {
    const cached = aqCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.data, isCached: true };
    }
  }

  const existing = inflightAq.get(key);
  if (existing && !options?.forceRefresh) {
    return existing;
  }

  const promise = fetchOpenMeteoAirQuality(lat, lon, options?.signal)
    .then((snapshot) => {
      aqCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: snapshot,
      });
      return snapshot;
    })
    .finally(() => {
      inflightAq.delete(key);
    });

  inflightAq.set(key, promise);
  return promise;
}

export function isTimestampStale(isoTimestamp: string | null | undefined): boolean {
  if (!isoTimestamp) return false;
  const ms = Date.parse(isoTimestamp);
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms > STALE_THRESHOLD_MS;
}

export interface UnifiedEnvironmentalLoadResult {
  weather: WeatherSnapshot | null;
  weatherError: string | null;
  airQuality: AirQualitySnapshot | null;
  airQualityError: string | null;
}

export async function loadEnvironmentalBundle(
  lat: number,
  lon: number,
  options?: { forceRefresh?: boolean; signal?: AbortSignal }
): Promise<UnifiedEnvironmentalLoadResult> {
  const [wxRes, aqRes] = await Promise.allSettled([
    getWeatherForCoordinates(lat, lon, options),
    getAirQualityForCoordinates(lat, lon, options),
  ]);

  return {
    weather: wxRes.status === 'fulfilled' ? wxRes.value : null,
    weatherError:
      wxRes.status === 'rejected'
        ? wxRes.reason instanceof Error
          ? wxRes.reason.message
          : 'Unable to fetch weather forecast.'
        : null,
    airQuality: aqRes.status === 'fulfilled' ? aqRes.value : null,
    airQualityError:
      aqRes.status === 'rejected'
        ? aqRes.reason instanceof Error
          ? aqRes.reason.message
          : 'Unable to fetch air quality estimates.'
        : null,
  };
}
