export interface CurrentWeatherData {
  temperatureC: number | null;
  relativeHumidityPct: number | null;
  apparentTemperatureC: number | null;
  precipitationMm: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windCardinal: string;
  weatherCode: number | null;
  conditionLabel: string;
  cloudCoverPct: number | null;
  apiTime: string | null;
}

export interface HourlyWeatherPoint {
  timeIso: string;
  hourLabel: string;
  temperatureC: number | null;
  relativeHumidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  precipitationProbPct: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
}

export interface DailyWeatherPoint {
  dateIso: string;
  dayLabel: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  sunriseIso: string | null;
  sunsetIso: string | null;
  maxWindSpeedKmh: number | null;
  maxPrecipProbPct: number | null;
}

export interface WeatherSnapshot {
  lat: number;
  lon: number;
  timezone: string;
  fetchedAt: string;
  isCached: boolean;
  current: CurrentWeatherData;
  hourly: HourlyWeatherPoint[];
  daily: DailyWeatherPoint[];
}

export class WeatherServiceError extends Error {
  code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR';

  constructor(
    code: 'NETWORK_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'UPSTREAM_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'WeatherServiceError';
    this.code = code;
  }
}

function toFiniteOrNull(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) ? Math.round(val * 10) / 10 : null;
}

export function degreesToCardinal(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8] ?? 'N';
}

export function describeWmoWeatherCode(code: number | null): string {
  if (code === null || !Number.isFinite(code)) return 'Data unavailable';
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog / Mist',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm with hail',
  };
  return map[code] ?? `Weather code ${code}`;
}

export async function fetchOpenMeteoWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherSnapshot> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new WeatherServiceError('UPSTREAM_ERROR', 'Valid latitude and longitude are required.');
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
      forecast_days: '3',
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
      hourly:
        'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,precipitation,cloud_cover',
      daily:
        'temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max,precipitation_probability_max',
    });

    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      signal: controller.signal,
    });

    if (resp.status === 429) {
      throw new WeatherServiceError(
        'RATE_LIMITED',
        'Open-Meteo weather rate limit reached. Please retry shortly.'
      );
    }
    if (!resp.ok) {
      throw new WeatherServiceError(
        'UPSTREAM_ERROR',
        `Open-Meteo forecast returned HTTP ${resp.status}.`
      );
    }

    let raw: {
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        weather_code?: number;
        cloud_cover?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
      };
      hourly?: {
        time?: string[];
        temperature_2m?: Array<number | null>;
        relative_humidity_2m?: Array<number | null>;
        wind_speed_10m?: Array<number | null>;
        wind_direction_10m?: Array<number | null>;
        precipitation_probability?: Array<number | null>;
        precipitation?: Array<number | null>;
        cloud_cover?: Array<number | null>;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        sunrise?: string[];
        sunset?: string[];
        wind_speed_10m_max?: Array<number | null>;
        precipitation_probability_max?: Array<number | null>;
      };
    };
    try {
      raw = await resp.json();
    } catch {
      throw new WeatherServiceError('UPSTREAM_ERROR', 'Open-Meteo returned malformed weather data.');
    }
    if (!raw || typeof raw !== 'object' || !raw.current || typeof raw.current !== 'object') {
      throw new WeatherServiceError('UPSTREAM_ERROR', 'Open-Meteo returned an invalid weather response.');
    }

    const windDeg = toFiniteOrNull(raw.current?.wind_direction_10m);
    const weatherCode = toFiniteOrNull(raw.current?.weather_code);

    const hourlyTimes = Array.isArray(raw.hourly?.time) ? raw.hourly!.time! : [];
    const hourly: HourlyWeatherPoint[] = hourlyTimes.slice(0, 24).map((t, i) => ({
      timeIso: t,
      hourLabel: t.length >= 16 ? t.slice(11, 16) : `${String(i).padStart(2, '0')}:00`,
      temperatureC: toFiniteOrNull(raw.hourly?.temperature_2m?.[i]),
      relativeHumidityPct: toFiniteOrNull(raw.hourly?.relative_humidity_2m?.[i]),
      windSpeedKmh: toFiniteOrNull(raw.hourly?.wind_speed_10m?.[i]),
      windDirectionDeg: toFiniteOrNull(raw.hourly?.wind_direction_10m?.[i]),
      precipitationProbPct: toFiniteOrNull(raw.hourly?.precipitation_probability?.[i]),
      precipitationMm: toFiniteOrNull(raw.hourly?.precipitation?.[i]),
      cloudCoverPct: toFiniteOrNull(raw.hourly?.cloud_cover?.[i]),
    }));

    const dailyTimes = Array.isArray(raw.daily?.time) ? raw.daily!.time! : [];
    const daily: DailyWeatherPoint[] = dailyTimes.slice(0, 3).map((d, i) => {
      const parsed = new Date(`${d}T12:00:00`);
      const dayLabel =
        i === 0
          ? 'Today'
          : Number.isNaN(parsed.getTime())
            ? d
            : parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      return {
        dateIso: d,
        dayLabel,
        tempMaxC: toFiniteOrNull(raw.daily?.temperature_2m_max?.[i]),
        tempMinC: toFiniteOrNull(raw.daily?.temperature_2m_min?.[i]),
        sunriseIso: raw.daily?.sunrise?.[i] ?? null,
        sunsetIso: raw.daily?.sunset?.[i] ?? null,
        maxWindSpeedKmh: toFiniteOrNull(raw.daily?.wind_speed_10m_max?.[i]),
        maxPrecipProbPct: toFiniteOrNull(raw.daily?.precipitation_probability_max?.[i]),
      };
    });

    return {
      lat,
      lon,
      timezone: raw.timezone || 'auto',
      fetchedAt: new Date().toISOString(),
      isCached: false,
      current: {
        temperatureC: toFiniteOrNull(raw.current?.temperature_2m),
        relativeHumidityPct: toFiniteOrNull(raw.current?.relative_humidity_2m),
        apparentTemperatureC: toFiniteOrNull(raw.current?.apparent_temperature),
        precipitationMm: toFiniteOrNull(raw.current?.precipitation),
        windSpeedKmh: toFiniteOrNull(raw.current?.wind_speed_10m),
        windDirectionDeg: windDeg,
        windCardinal: degreesToCardinal(windDeg),
        weatherCode,
        conditionLabel: describeWmoWeatherCode(weatherCode),
        cloudCoverPct: toFiniteOrNull(raw.current?.cloud_cover),
        apiTime: raw.current?.time ?? null,
      },
      hourly,
      daily,
    };
  } catch (err) {
    if (err instanceof WeatherServiceError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new WeatherServiceError('TIMEOUT', 'Open-Meteo weather request timed out.');
    }
    throw new WeatherServiceError(
      'NETWORK_UNAVAILABLE',
      'Unable to reach Open-Meteo weather API. Check network connectivity.'
    );
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onParentAbort);
  }
}
