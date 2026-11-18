import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudRain,
  Compass,
  Droplets,
  Info,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  ShieldAlert,
  Sunrise,
  Sunset,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';
import type { HouseholdProfile } from '../data/airQualityData';
import type { ActiveLocation, AsyncFetchStatus } from '../types/environment';
import type { AirQualitySnapshot } from '../services/airQualityService';
import type { WeatherSnapshot } from '../services/weatherService';
import type { DeterministicSafetyGuidance } from '../services/safetyRules';
import { searchLocations, type GeocodedLocation } from '../services/geocodingService';
import { isTimestampStale } from '../services/environmentalDataService';

interface UnderstandAirSectionProps {
  location: ActiveLocation;
  presets: ActiveLocation[];
  recentLocations: ActiveLocation[];
  onSelectLocation: (loc: ActiveLocation) => void;
  onDetectLocation: () => void;
  locationDetectStatus: 'idle' | 'detecting' | 'success' | 'error';
  locationDetectError: string | null;
  weather: WeatherSnapshot | null;
  weatherStatus: AsyncFetchStatus;
  weatherError: string | null;
  onRetryWeather: () => void;
  airQuality: AirQualitySnapshot | null;
  aqStatus: AsyncFetchStatus;
  aqError: string | null;
  onRetryAirQuality: () => void;
  onRefreshAll: () => void;
  safety: DeterministicSafetyGuidance;
  profiles: HouseholdProfile[];
  selectedProfile: HouseholdProfile;
  onSelectProfile: (profileId: string) => void;
  activeDbProfileName?: string | null;
  activeSafetyTarget: number;
  estimatedIndoorPm25: number | null;
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return 'Unavailable';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtMetric(val: number | null | undefined, unit: string): string {
  return val !== null && val !== undefined && Number.isFinite(val)
    ? `${val} ${unit}`
    : 'Data unavailable';
}

export function UnderstandAirSection({
  location,
  presets,
  recentLocations,
  onSelectLocation,
  onDetectLocation,
  locationDetectStatus,
  locationDetectError,
  weather,
  weatherStatus,
  weatherError,
  onRetryWeather,
  airQuality,
  aqStatus,
  aqError,
  onRetryAirQuality,
  onRefreshAll,
  safety,
  profiles,
  selectedProfile,
  onSelectProfile,
  activeDbProfileName,
  activeSafetyTarget,
  estimatedIndoorPm25,
}: UnderstandAirSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Debounced Open-Meteo Geocoding search
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const hits = await searchLocations(trimmed, controller.signal);
        setSearchResults(hits);
        setDropdownOpen(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Unable to search cities.');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handlePickResult = (hit: GeocodedLocation) => {
    onSelectLocation({
      id: hit.id,
      name: hit.name,
      admin1: hit.admin1,
      country: hit.country,
      lat: hit.lat,
      lon: hit.lon,
      timezone: hit.timezone,
      source: 'open-meteo-geocoding',
    });
    setSearchTerm('');
    setSearchResults([]);
    setDropdownOpen(false);
  };

  const usAqi = airQuality?.current.usAqi ?? null;
  const euAqi = airQuality?.current.europeanAqi ?? null;
  const playVerdict = selectedProfile.outdoorPlayAllowed(usAqi);

  const weatherStale = isTimestampStale(weather?.fetchedAt);
  const aqStale = isTimestampStale(airQuality?.fetchedAt);

  const severityTone =
    usAqi === null
      ? 'text-slate-200 border-slate-700 bg-slate-950'
      : safety.severity === 'severe' || safety.severity === 'very-poor'
        ? 'text-rose-200 border-rose-400/50 bg-rose-500/15 shadow-[0_0_24px_rgba(251,113,133,0.18)]'
        : safety.severity === 'poor' || safety.severity === 'sensitive'
          ? 'text-amber-200 border-amber-400/45 bg-amber-500/15 shadow-[0_0_24px_rgba(245,158,11,0.16)]'
          : 'text-emerald-200 border-emerald-400/40 bg-emerald-500/12';

  return (
    <section
      id="section-2"
      aria-label="Section 2 — Live Location, Weather & Air Quality Telemetry"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-8"
    >
      {/* Header + Location Detection + Open-Meteo Geocoding Search */}
      <div className="space-y-6 chapter-reveal">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-amber-400">
              02 · Live Location, Weather & Air Telemetry
            </p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
              Search any city or detect your coordinates.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              Powered directly by zero-cost Open-Meteo Geocoding, Forecast, and Air Quality APIs
              plus native browser GPS detection—zero paid map keys required.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onDetectLocation}
              disabled={locationDetectStatus === 'detecting'}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 shadow-[0_0_22px_rgba(245,158,11,0.25)]"
            >
              {locationDetectStatus === 'detecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Navigation className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {locationDetectStatus === 'detecting' ? 'Detecting Location…' : 'Detect My Location'}
              </span>
            </button>

            <button
              type="button"
              onClick={onRefreshAll}
              disabled={weatherStatus === 'loading' || aqStatus === 'loading'}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-300 ${
                  weatherStatus === 'loading' || aqStatus === 'loading' ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Search Input + Quick Presets + Recent Locations */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Debounced Open-Meteo City Search */}
            <div ref={searchBoxRef} className="lg:col-span-6 relative">
              <label htmlFor="open-meteo-city-search" className="block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400 mb-1.5">
                City & Locality Search (Open-Meteo Geocoding)
              </label>
              <div className="relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="open-meteo-city-search"
                  type="text"
                  value={searchTerm}
                  onFocus={() => {
                    if (searchResults.length > 0) setDropdownOpen(true);
                  }}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDropdownOpen(true);
                  }}
                  placeholder="Type a city name (e.g. Hyderabad, Pune, Paris, Tokyo)…"
                  className="w-full pl-10 pr-10 py-2.5 min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
                {searchLoading && (
                  <Loader2
                    className="w-4 h-4 text-amber-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2"
                    aria-label="Searching cities"
                  />
                )}
              </div>

              {searchError && (
                <p className="mt-1.5 text-xs font-mono text-rose-300" role="alert">
                  {searchError}
                </p>
              )}

              {dropdownOpen && searchTerm.trim().length >= 2 && !searchLoading && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      No matching localities returned by Open-Meteo Geocoding for “{searchTerm}”.
                    </div>
                  ) : (
                    <ul>
                      {searchResults.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            onClick={() => handlePickResult(hit)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-900 border-b border-slate-800/80 last:border-b-0 flex items-center justify-between gap-3 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                                {hit.name}
                                {hit.admin1 ? `, ${hit.admin1}` : ''}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {hit.country} · {hit.timezone}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-amber-300 shrink-0 tabular-nums">
                              {hit.lat.toFixed(2)}, {hit.lon.toFixed(2)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Active Selected Location Coordinates + Quick Presets */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="text-slate-400 uppercase tracking-[0.15em]">
                  Quick Locations & Recent
                </span>
                <span className="text-emerald-300 tabular-nums">
                  Active: {location.name} ({location.lat.toFixed(3)}, {location.lon.toFixed(3)})
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                  const isCurrent =
                    Math.abs(preset.lat - location.lat) < 0.01 &&
                    Math.abs(preset.lon - location.lon) < 0.01;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectLocation(preset)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-400/45'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
                {recentLocations
                  .filter(
                    (r) =>
                      !presets.some(
                        (p) => Math.abs(p.lat - r.lat) < 0.01 && Math.abs(p.lon - r.lon) < 0.01
                      )
                  )
                  .slice(0, 3)
                  .map((recent) => {
                    const isCurrent =
                      Math.abs(recent.lat - location.lat) < 0.01 &&
                      Math.abs(recent.lon - location.lon) < 0.01;
                    return (
                      <button
                        key={recent.id}
                        type="button"
                        onClick={() => onSelectLocation(recent)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-semibold'
                            : 'bg-slate-950 border-emerald-400/30 text-emerald-300 hover:border-emerald-400/60'
                        }`}
                      >
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        <span>{recent.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Browser Geolocation Feedback Banner */}
          {locationDetectError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                <span>{locationDetectError}</span>
              </div>
              <button
                type="button"
                onClick={onDetectLocation}
                className="px-3 py-1 rounded-lg border border-rose-300/40 text-rose-100 hover:bg-rose-500/20 font-mono cursor-pointer"
              >
                Retry Detection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Independent Air Quality & Weather Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 chapter-reveal">
        {/* LEFT: AIR QUALITY ESTIMATES CARD */}
        <div className="xl:col-span-6 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-rose-300">
                Air Quality · Model Estimates (Open-Meteo)
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Updated: {formatClock(airQuality?.fetchedAt)}{' '}
                {airQuality?.isCached && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                    CACHED
                  </span>
                )}
                {aqStale && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    STALE
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onRetryAirQuality}
              disabled={aqStatus === 'loading'}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:border-amber-400/50 text-[11px] font-mono text-slate-300 cursor-pointer"
            >
              {aqStatus === 'loading' ? 'Fetching…' : 'Retry AQ'}
            </button>
          </div>

          {aqError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 flex items-center justify-between gap-3 text-xs text-rose-200"
            >
              <span>{aqError}</span>
              <button
                type="button"
                onClick={onRetryAirQuality}
                className="px-3 py-1.5 rounded-lg bg-rose-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Dual Clearly Labeled AQI Standards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border ${severityTone}`}>
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] opacity-85">
                US EPA AQI (0–500 Scale)
              </p>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-3xl font-mono font-semibold tabular-nums">
                  {aqStatus === 'loading' && usAqi === null
                    ? '…'
                    : usAqi !== null
                      ? Math.round(usAqi)
                      : 'Unavailable'}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-90">{safety.usAqiBand}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">
                European AQI (EAQI Standard)
              </p>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-3xl font-mono font-semibold tabular-nums text-amber-300">
                  {aqStatus === 'loading' && euAqi === null
                    ? '…'
                    : euAqi !== null
                      ? Math.round(euAqi)
                      : 'Unavailable'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{safety.europeanAqiBand}</p>
            </div>
          </div>

          {/* 6 Pollutant Grid (Strict µg/m³ & Non-Fabricated Unavailable States) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'PM2.5', value: airQuality?.current.pm25, accent: 'text-rose-300' },
              { label: 'PM10', value: airQuality?.current.pm10, accent: 'text-amber-300' },
              { label: 'NO2', value: airQuality?.current.no2, accent: 'text-amber-200' },
              { label: 'Ozone (O3)', value: airQuality?.current.o3, accent: 'text-emerald-300' },
              { label: 'SO2', value: airQuality?.current.so2, accent: 'text-violet-300' },
              { label: 'CO', value: airQuality?.current.co, accent: 'text-sky-300' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3"
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </p>
                <p className={`mt-1 text-sm sm:text-base font-mono tabular-nums ${item.accent}`}>
                  {aqStatus === 'loading' && !airQuality
                    ? 'Loading…'
                    : fmtMetric(item.value, 'µg/m³')}
                </p>
              </div>
            ))}
          </div>

          {/* Mandatory Model-Estimate Transparency Disclosure */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Open-Meteo air-quality readings are regional model-based estimates (CAMS assimilation)
              and may differ from street-level sensor hardware. US AQI and European AQI use
              different calculation scales and are displayed separately.
            </span>
          </div>
        </div>

        {/* RIGHT: LIVE WEATHER & 3-DAY FORECAST CARD */}
        <div className="xl:col-span-6 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-300">
                Weather Telemetry · Open-Meteo Forecast ({weather?.timezone || location.timezone})
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Updated: {formatClock(weather?.fetchedAt)}{' '}
                {weather?.isCached && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                    CACHED
                  </span>
                )}
                {weatherStale && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    STALE
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={onRetryWeather}
              disabled={weatherStatus === 'loading'}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:border-emerald-400/50 text-[11px] font-mono text-slate-300 cursor-pointer"
            >
              {weatherStatus === 'loading' ? 'Fetching…' : 'Retry Weather'}
            </button>
          </div>

          {weatherError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 flex items-center justify-between gap-3 text-xs text-rose-200"
            >
              <span>{weatherError}</span>
              <button
                type="button"
                onClick={onRetryWeather}
                className="px-3 py-1.5 rounded-lg bg-rose-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Current Weather Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span>Temp / Feels Like</span>
              </p>
              <p className="mt-1 text-base font-mono tabular-nums text-slate-100">
                {weather?.current.temperatureC !== null && weather?.current.temperatureC !== undefined
                  ? `${weather.current.temperatureC}°C`
                  : 'Data unavailable'}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Apparent:{' '}
                {weather?.current.apparentTemperatureC !== null &&
                weather?.current.apparentTemperatureC !== undefined
                  ? `${weather.current.apparentTemperatureC}°C`
                  : 'Unavailable'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wind</span>
              </p>
              <p className="mt-1 text-base font-mono tabular-nums text-slate-100">
                {weather?.current.windSpeedKmh !== null &&
                weather?.current.windSpeedKmh !== undefined
                  ? `${weather.current.windSpeedKmh} km/h`
                  : 'Data unavailable'}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                Dir: {weather?.current.windCardinal || '—'}{' '}
                {weather?.current.windDirectionDeg !== null &&
                weather?.current.windDirectionDeg !== undefined
                  ? `(${weather.current.windDirectionDeg}°)`
                  : ''}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span>Humidity</span>
              </p>
              <p className="mt-1 text-base font-mono tabular-nums text-slate-100">
                {fmtMetric(weather?.current.relativeHumidityPct, '%')}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                {weather?.current.conditionLabel || 'Condition pending'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-sky-300" />
                <span>Precipitation</span>
              </p>
              <p className="mt-1 text-sm font-mono tabular-nums text-slate-100">
                {fmtMetric(weather?.current.precipitationMm, 'mm')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-slate-300" />
                <span>Cloud Cover</span>
              </p>
              <p className="mt-1 text-sm font-mono tabular-nums text-slate-100">
                {fmtMetric(weather?.current.cloudCoverPct, '%')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <p className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span>Today Sun</span>
              </p>
              <p className="mt-1 text-[11px] font-mono text-slate-200 flex items-center gap-1">
                <Sunrise className="w-3 h-3 text-amber-300" />
                <span>
                  {weather?.daily[0]?.sunriseIso
                    ? weather.daily[0].sunriseIso.slice(11, 16)
                    : '—'}
                </span>
                <Sunset className="w-3 h-3 text-rose-300 ml-1" />
                <span>
                  {weather?.daily[0]?.sunsetIso
                    ? weather.daily[0].sunsetIso.slice(11, 16)
                    : '—'}
                </span>
              </p>
            </div>
          </div>

          {/* 3-Day Daily Forecast Strip */}
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
              3-Day Daily Forecast (Open-Meteo)
            </p>
            {weather && weather.daily.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {weather.daily.map((day) => (
                  <div
                    key={day.dateIso}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs space-y-1"
                  >
                    <p className="font-semibold text-slate-100">{day.dayLabel}</p>
                    <p className="font-mono tabular-nums text-amber-300">
                      {day.tempMaxC ?? '—'}° / {day.tempMinC ?? '—'}°C
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Wind ≤ {day.maxWindSpeedKmh ?? '—'} km/h · Rain {day.maxPrecipProbPct ?? '—'}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400">
                {weatherStatus === 'loading' ? 'Loading daily forecast…' : 'Daily forecast unavailable.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Household Profile Selector & Deterministic Safety Verdict */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 chapter-reveal">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>
              Household Vulnerability Profile
              {activeDbProfileName ? ` · Custom Override: ${activeDbProfileName}` : ''}
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-300">
            Safe indoor target: ≤ {activeSafetyTarget} µg/m³
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Household profile"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
        >
          {profiles.map((profile) => {
            const active = profile.id === selectedProfile.id && !activeDbProfileName;
            return (
              <button
                key={profile.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelectProfile(profile.id)}
                className={`text-left px-4 py-3 min-h-[52px] rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-950 border-amber-400/65 text-slate-50 shadow-[0_0_20px_rgba(245,158,11,0.14)]'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                <p className="text-xs sm:text-sm font-semibold">{profile.shortLabel}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {profile.membersSummary}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs sm:text-sm leading-relaxed text-slate-300">
              <strong className="text-slate-100">
                Deterministic Health Verdict ({playVerdict.status}):
              </strong>{' '}
              {playVerdict.note} <span className="text-slate-400">{safety.maskGuidance}</span>
            </div>
          </div>
          <div className="shrink-0 font-mono text-xs tabular-nums px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-400/35 text-emerald-300">
            Modeled Indoor:{' '}
            {estimatedIndoorPm25 !== null ? `${estimatedIndoorPm25} µg/m³` : 'Pending PM2.5'}
          </div>
        </div>
      </div>
    </section>
  );
}
