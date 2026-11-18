export type GeolocationErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export class GeolocationServiceError extends Error {
  code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = 'GeolocationServiceError';
    this.code = code;
  }
}

export interface DetectedCoordinates {
  lat: number;
  lon: number;
  accuracyMeters: number | null;
  detectedAt: string;
  name: string;
  admin1?: string;
  country?: string;
  areaLabel?: string;
}

export async function detectBrowserLocation(): Promise<DetectedCoordinates> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new GeolocationServiceError(
      'UNSUPPORTED',
      'Browser geolocation is not supported on this device. Please search for your city manually.'
    );
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(
              new GeolocationServiceError(
                'PERMISSION_DENIED',
                'Location permission was denied. Enable browser location access or select a city manually below.'
              )
            );
            break;
          case err.POSITION_UNAVAILABLE:
            reject(
              new GeolocationServiceError(
                'POSITION_UNAVAILABLE',
                'Device location is currently unavailable. Please search for your city manually.'
              )
            );
            break;
          case err.TIMEOUT:
            reject(
              new GeolocationServiceError(
                'TIMEOUT',
                'Location detection timed out. Retry or enter your city in the search box.'
              )
            );
            break;
          default:
            reject(
              new GeolocationServiceError(
                'UNKNOWN',
                err.message || 'Unable to determine browser location.'
              )
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });

  const lat = Number(position.coords.latitude.toFixed(4));
  const lon = Number(position.coords.longitude.toFixed(4));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new GeolocationServiceError('UNKNOWN', 'The browser returned invalid location coordinates. Please select a city manually.');
  }
  const accuracyMeters = Number.isFinite(position.coords.accuracy)
    ? Math.round(position.coords.accuracy)
    : null;
  const detectedAt = new Date().toISOString();

  // Best-effort zero-cost reverse locality label via server Nominatim proxy (never blocks coordinate telemetry)
  let name = `Detected Area (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  let admin1: string | undefined;
  let country: string | undefined;
  let areaLabel: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const data = (await resp.json()) as {
        city?: string;
        area?: string;
        admin1?: string;
        country?: string;
      };
      if (data.city) name = data.city;
      if (data.area) areaLabel = data.area;
      if (data.admin1) admin1 = data.admin1;
      if (data.country) country = data.country;
    }
  } catch {
    // Graceful fallback: exact coordinates remain ready for Open-Meteo APIs
  }

  return {
    lat,
    lon,
    accuracyMeters,
    detectedAt,
    name,
    admin1,
    country,
    areaLabel,
  };
}
