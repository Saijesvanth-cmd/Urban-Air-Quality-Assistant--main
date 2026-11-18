export interface CurrentAirQualityData {
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
  apiTime: string | null;
}

export interface HourlyAirQualityPoint {
  timeIso: string;
  hourLabel: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  usAqi: number | null;
  europeanAqi: number | null;
}

export interface AirQualitySnapshot {
  lat: number;
  lon: number;
  timezone: string;
  fetchedAt: string;
  isCached: boolean;
  isModelEstimate: true;
  disclosure: string;
  current: CurrentAirQualityData;
  hourly: HourlyAirQualityPoint[];
}

export class AirQualityServiceError extends Error {
  code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR';

  constructor(
    code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'AirQualityServiceError';
    this.code = code;
  }
}

function toFiniteOrNull(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
    ? Math.round(val * 10) / 10
    : null;
}

export async function fetchOpenMeteoAirQuality(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<AirQualitySnapshot> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new AirQualityServiceError('UPSTREAM_ERROR', 'Valid latitude and longitude are required.');
  }
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onParentAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: 'auto',
      forecast_days: '2',
      current:
        'european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
      hourly: 'pm2_5,pm10,nitrogen_dioxide,ozone,european_aqi,us_aqi',
    });

    const resp = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`,
      { signal: controller.signal }
    );

    if (resp.status === 429) {
      throw new AirQualityServiceError(
        'RATE_LIMITED',
        'Open-Meteo air-quality rate limit reached. Please retry shortly.'
      );
    }
    if (!resp.ok) {
      throw new AirQualityServiceError(
        'UPSTREAM_ERROR',
        `Open-Meteo air quality returned HTTP ${resp.status}.`
      );
    }

    let raw: {
      timezone?: string;
      current?: {
        time?: string;
        european_aqi?: number | null;
        us_aqi?: number | null;
        pm2_5?: number | null;
        pm10?: number | null;
        nitrogen_dioxide?: number | null;
        ozone?: number | null;
        sulphur_dioxide?: number | null;
        carbon_monoxide?: number | null;
      };
      hourly?: {
        time?: string[];
        pm2_5?: Array<number | null>;
        pm10?: Array<number | null>;
        nitrogen_dioxide?: Array<number | null>;
        ozone?: Array<number | null>;
        european_aqi?: Array<number | null>;
        us_aqi?: Array<number | null>;
      };
    };
    try {
      raw = await resp.json();
    } catch {
      throw new AirQualityServiceError('UPSTREAM_ERROR', 'Open-Meteo returned malformed air-quality data.');
    }
    if (!raw || typeof raw !== 'object' || !raw.current || typeof raw.current !== 'object') {
      throw new AirQualityServiceError('UPSTREAM_ERROR', 'Open-Meteo returned an invalid air-quality response.');
    }

    const hourlyTimes = Array.isArray(raw.hourly?.time) ? raw.hourly!.time! : [];
    const hourly: HourlyAirQualityPoint[] = hourlyTimes.slice(0, 24).map((t, i) => ({
      timeIso: t,
      hourLabel: t.length >= 16 ? t.slice(11, 16) : `${String(i).padStart(2, '0')}:00`,
      pm25: toFiniteOrNull(raw.hourly?.pm2_5?.[i]),
      pm10: toFiniteOrNull(raw.hourly?.pm10?.[i]),
      no2: toFiniteOrNull(raw.hourly?.nitrogen_dioxide?.[i]),
      o3: toFiniteOrNull(raw.hourly?.ozone?.[i]),
      usAqi: toFiniteOrNull(raw.hourly?.us_aqi?.[i]),
      europeanAqi: toFiniteOrNull(raw.hourly?.european_aqi?.[i]),
    }));

    return {
      lat,
      lon,
      timezone: raw.timezone || 'auto',
      fetchedAt: new Date().toISOString(),
      isCached: false,
      isModelEstimate: true,
      disclosure:
        'Open-Meteo air quality values are regional atmospheric model estimates (CAMS assimilation), not ground-station sensor measurements.',
      current: {
        usAqi: toFiniteOrNull(raw.current?.us_aqi),
        europeanAqi: toFiniteOrNull(raw.current?.european_aqi),
        pm25: toFiniteOrNull(raw.current?.pm2_5),
        pm10: toFiniteOrNull(raw.current?.pm10),
        no2: toFiniteOrNull(raw.current?.nitrogen_dioxide),
        o3: toFiniteOrNull(raw.current?.ozone),
        so2: toFiniteOrNull(raw.current?.sulphur_dioxide),
        co: toFiniteOrNull(raw.current?.carbon_monoxide),
        apiTime: raw.current?.time ?? null,
      },
      hourly,
    };
  } catch (err) {
    if (err instanceof AirQualityServiceError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new AirQualityServiceError('TIMEOUT', 'Open-Meteo air quality request timed out.');
    }
    throw new AirQualityServiceError(
      'NETWORK_UNAVAILABLE',
      'Unable to reach Open-Meteo air-quality API. Check network connectivity.'
    );
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onParentAbort);
  }
}
