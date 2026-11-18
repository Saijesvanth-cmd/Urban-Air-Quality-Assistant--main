import { ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react';
import type { ActiveLocation, AsyncFetchStatus } from '../types/environment';
import type { AirQualitySnapshot } from '../services/airQualityService';
import type { WeatherSnapshot } from '../services/weatherService';
import { MagneticButton } from './MagneticButton';

interface HeroSectionProps {
  location: ActiveLocation;
  weather: WeatherSnapshot | null;
  weatherStatus: AsyncFetchStatus;
  airQuality: AirQualitySnapshot | null;
  aqStatus: AsyncFetchStatus;
  saferWindowLabel: string | null;
}

export function HeroSection({
  location,
  weather,
  weatherStatus,
  airQuality,
  aqStatus,
  saferWindowLabel,
}: HeroSectionProps) {
  const usAqi = airQuality?.current.usAqi ?? null;
  const euAqi = airQuality?.current.europeanAqi ?? null;
  const pm25 = airQuality?.current.pm25 ?? null;
  const isElevated = usAqi !== null && usAqi >= 151;

  const tempC = weather?.current.temperatureC ?? null;
  const windKmh = weather?.current.windSpeedKmh ?? null;
  const windDir = weather?.current.windCardinal ?? '—';

  return (
    <section
      id="hero"
      aria-label="Urban Air Quality Assistant Hero — Every breath tells a story"
      className="relative min-h-screen flex flex-col justify-between pt-24 pb-10 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="inline-flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              isElevated ? 'bg-rose-400' : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
          <span className="uppercase tracking-[0.22em] font-mono text-[11px] text-amber-300">
            Zero-Cost Open-Meteo Telemetry
          </span>
        </div>
        <div className="font-mono tabular-nums text-[11px] tracking-wide text-slate-300">
          {location.areaLabel ? `${location.areaLabel}, ` : ''}
          {location.name}
          {location.country ? `, ${location.country}` : ''} · US AQI{' '}
          {aqStatus === 'loading' && usAqi === null ? '…' : usAqi ?? 'Unavailable'} · EAQI{' '}
          {aqStatus === 'loading' && euAqi === null ? '…' : euAqi ?? 'Unavailable'}
        </div>
      </div>

      <div className="my-auto py-12 max-w-2xl">
        <p className="hero-stagger text-xs font-mono uppercase tracking-[0.24em] text-amber-400 mb-5">
          Urban Air Quality Assistant · AEROVA Core
        </p>

        <h1 className="hero-stagger text-4xl sm:text-6xl lg:text-[4.6rem] font-light leading-[1.03] tracking-[-0.025em] text-slate-50 text-balance">
          Every breath tells a{' '}
          <span className="italic font-normal text-amber-400 drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]">
            story.
          </span>
        </h1>

        <p className="hero-stagger mt-6 text-base sm:text-xl text-slate-300 max-w-xl leading-relaxed font-normal">
          Understand the air around you. Detect your coordinates or search any city worldwide for
          live Open-Meteo weather, modeled air quality estimates, and family safety guidance.
        </p>

        <div className="hero-stagger mt-9 flex flex-wrap items-center gap-4">
          <MagneticButton
            href="#section-2"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 min-h-[48px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold tracking-tight transition-colors shadow-[0_0_32px_rgba(245,158,11,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <span>Explore Live Telemetry</span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </MagneticButton>

          <MagneticButton
            href="#section-3"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 min-h-[48px] rounded-xl border border-rose-400/40 bg-slate-900/95 hover:bg-slate-800 hover:border-rose-400/70 text-slate-100 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            <Sparkles className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Discover the Intelligence</span>
          </MagneticButton>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6 border-t border-slate-800/90 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
              PM2.5 (Model Est.)
            </p>
            <p className="mt-1 text-lg font-mono tabular-nums text-rose-300">
              {aqStatus === 'loading' && pm25 === null ? (
                'Loading…'
              ) : pm25 !== null ? (
                <>
                  {pm25} <span className="text-xs text-slate-400">µg/m³</span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Data unavailable</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">Wind</p>
            <p className="mt-1 text-lg font-mono tabular-nums text-slate-100">
              {weatherStatus === 'loading' && windKmh === null ? (
                'Loading…'
              ) : windKmh !== null ? (
                <>
                  {windKmh} <span className="text-xs text-slate-400">km/h {windDir}</span>
                </>
              ) : (
                <span className="text-xs text-slate-400">Data unavailable</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">Temp</p>
            <p className="mt-1 text-lg font-mono tabular-nums text-amber-300">
              {weatherStatus === 'loading' && tempC === null ? (
                'Loading…'
              ) : tempC !== null ? (
                `${tempC}°C`
              ) : (
                <span className="text-xs text-slate-400">Data unavailable</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
              Lower Forecast Window
            </p>
            <p className="mt-1 text-sm sm:text-base font-mono tabular-nums text-emerald-300">
              {saferWindowLabel || 'Pending forecast'}
            </p>
          </div>
        </div>

        <a
          href="#section-1"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-slate-400 hover:text-amber-300 transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
        >
          <span>Descend into telemetry</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
