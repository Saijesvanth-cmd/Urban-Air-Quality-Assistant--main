import { useState } from 'react';
import { ChevronLeft, ChevronRight, Radio, Tv } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActiveLocation, AsyncFetchStatus } from '../types/environment';
import type { AirQualitySnapshot } from '../services/airQualityService';
import type { WeatherSnapshot } from '../services/weatherService';

interface RetroCrtCarouselProps {
  location: ActiveLocation;
  weather: WeatherSnapshot | null;
  weatherStatus: AsyncFetchStatus;
  airQuality: AirQualitySnapshot | null;
  aqStatus: AsyncFetchStatus;
  saferWindowLabel: string | null;
  saferWindowHours: [number, number] | null;
  householdShortLabel: string;
  activeSafetyTarget: number;
  reductionRatio: number;
  estimatedIndoorPm25: number | null;
  activeRoutines: Array<{ title: string; category: string; pm25ReductionUg: number }>;
}

interface ChannelDef {
  code: string;
  title: string;
  subtitle: string;
  badge: string;
  phosphor: 'amber' | 'coral' | 'emerald';
}

const CHANNELS: ChannelDef[] = [
  {
    code: 'CH-01',
    title: 'PM2.5 Forecast vs. Indoor Shield',
    subtitle: 'Open-Meteo 24h hourly PM2.5 forecast curve vs. modeled indoor target',
    badge: '24H AQ FORECAST',
    phosphor: 'amber',
  },
  {
    code: 'CH-02',
    title: 'Hourly Weather Dispersion',
    subtitle: 'Open-Meteo hourly temperature (°C), wind speed (km/h), and precip probability (%)',
    badge: '24H WEATHER',
    phosphor: 'emerald',
  },
  {
    code: 'CH-03',
    title: 'Gas & Aerosol Mass Matrix',
    subtitle: 'Current Open-Meteo model estimates (µg/m³) against WHO 24h reference benchmarks',
    badge: 'CHEM SPEC',
    phosphor: 'coral',
  },
  {
    code: 'CH-04',
    title: 'Mitigation Attenuation',
    subtitle: 'Modeled indoor PM2.5 cut contributed by active household filtration & sealing',
    badge: 'FILTER GAIN',
    phosphor: 'emerald',
  },
];

export function RetroCrtCarousel({
  location,
  weather,
  weatherStatus,
  airQuality,
  aqStatus,
  saferWindowLabel,
  saferWindowHours,
  householdShortLabel,
  activeSafetyTarget,
  reductionRatio,
  estimatedIndoorPm25,
  activeRoutines,
}: RetroCrtCarouselProps) {
  const [channelIdx, setChannelIdx] = useState(0);
  const channel = CHANNELS[channelIdx] ?? CHANNELS[0];

  const handlePrev = () => setChannelIdx((prev) => (prev - 1 + CHANNELS.length) % CHANNELS.length);
  const handleNext = () => setChannelIdx((prev) => (prev + 1) % CHANNELS.length);

  const hourlyAqData = (airQuality?.hourly ?? [])
    .filter((pt) => pt.pm25 !== null)
    .map((pt) => ({
      hourLabel: pt.hourLabel,
      outdoor: pt.pm25 as number,
      indoor: Math.max(8, Math.round((pt.pm25 as number) * (1 - reductionRatio))),
    }));

  const hourlyWeatherData = (weather?.hourly ?? []).map((pt) => ({
    hourLabel: pt.hourLabel,
    tempC: pt.temperatureC,
    windKmh: pt.windSpeedKmh,
    precipProb: pt.precipitationProbPct,
  }));

  const chemicalMatrix = airQuality
    ? [
        { name: 'PM2.5', measured: airQuality.current.pm25, who: 15 },
        { name: 'PM10', measured: airQuality.current.pm10, who: 45 },
        { name: 'NO2', measured: airQuality.current.no2, who: 25 },
        { name: 'O3', measured: airQuality.current.o3, who: 60 },
        { name: 'SO2', measured: airQuality.current.so2, who: 40 },
      ].filter((row) => row.measured !== null)
    : [];

  const routineDecayData =
    activeRoutines.length > 0
      ? activeRoutines.map((r, i) => ({
          name: `R${i + 1}`,
          fullTitle: r.title,
          cutUg: r.pm25ReductionUg,
        }))
      : [{ name: 'NONE', fullTitle: 'No routines active', cutUg: 0 }];

  const ventStartLabel = saferWindowHours
    ? `${String(saferWindowHours[0]).padStart(2, '0')}:00`
    : undefined;
  const ventEndLabel = saferWindowHours
    ? `${String(saferWindowHours[1]).padStart(2, '0')}:00`
    : undefined;

  const accentBorder =
    channel.phosphor === 'coral'
      ? 'border-rose-400/35 shadow-[0_0_48px_rgba(251,113,133,0.14)]'
      : channel.phosphor === 'emerald'
        ? 'border-emerald-400/35 shadow-[0_0_48px_rgba(52,211,153,0.12)]'
        : 'border-amber-400/35 shadow-[0_0_48px_rgba(245,158,11,0.14)]';

  const phosphorText =
    channel.phosphor === 'coral'
      ? 'text-rose-300'
      : channel.phosphor === 'emerald'
        ? 'text-emerald-300'
        : 'text-amber-300';

  return (
    <section
      id="crt-carousel"
      aria-label="Retro CRT Telemetry Carousel"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 chapter-reveal">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-amber-400 flex items-center gap-2">
            <Tv className="w-3.5 h-3.5" aria-hidden="true" />
            <span>CRT Telemetry Bank · Live Open-Meteo Forecasts</span>
          </p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
            Cycle live forecast channels across {location.name}.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous CRT channel"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="CRT telemetry channels">
            {CHANNELS.map((c, idx) => {
              const active = idx === channelIdx;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChannelIdx(idx)}
                  className={`px-3 py-2 min-h-[40px] rounded-xl border font-mono text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700'
                  }`}
                >
                  {c.code}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next CRT channel"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={`relative rounded-[28px] border-4 border-slate-800 bg-slate-900/95 p-3 sm:p-5 transition-all duration-300 chapter-reveal ${accentBorder}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Radio className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
              <span>{channel.code}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-200 uppercase tracking-wider">{channel.badge}</span>
            <span className="hidden sm:inline text-slate-500">
              · {location.name} ({location.lat.toFixed(2)}, {location.lon.toFixed(2)})
            </span>
          </div>

          <div className="flex items-center gap-4 tabular-nums">
            <span>TARGET ≤ {activeSafetyTarget} µg/m³</span>
            <span className={phosphorText}>
              INDOOR EST: {estimatedIndoorPm25 !== null ? `${estimatedIndoorPm25} µg/m³` : 'Pending'}
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[20px] border border-slate-700/80 bg-[#030916] crt-vignette p-5 sm:p-7">
          <div aria-hidden="true" className="crt-scanlines absolute inset-0 pointer-events-none z-10" />

          <div className="relative z-20 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/90 pb-4">
              <div>
                <h3 className={`text-lg sm:text-xl font-mono font-semibold ${phosphorText}`}>
                  {channel.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{channel.subtitle}</p>
              </div>
              <div className="text-left sm:text-right font-mono text-xs tabular-nums">
                <p className="text-slate-400">PROFILE: {householdShortLabel.toUpperCase()}</p>
                <p className="text-emerald-300 mt-0.5">
                  LOWER WINDOW: {saferWindowLabel || 'Pending forecast'}
                </p>
              </div>
            </div>

            <div className="h-[290px] w-full">
              {channelIdx === 0 &&
                (hourlyAqData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyAqData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="crtAmber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.42} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="crtEmerald" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34D399" stopOpacity={0.38} />
                          <stop offset="95%" stopColor="#34D399" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hourLabel" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} interval={3} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} unit=" µg" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: 'rgba(245,158,11,0.4)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                      />
                      {ventStartLabel && ventEndLabel && (
                        <ReferenceArea x1={ventStartLabel} x2={ventEndLabel} fill="#34D399" fillOpacity={0.12} />
                      )}
                      <ReferenceLine
                        y={activeSafetyTarget}
                        stroke="#34D399"
                        strokeDasharray="4 4"
                        label={{ value: `Safe ≤ ${activeSafetyTarget}`, fill: '#34D399', fontSize: 10, position: 'insideTopRight' }}
                      />
                      <Area type="monotone" dataKey="outdoor" name="Open-Meteo PM2.5 Forecast" stroke="#F59E0B" strokeWidth={2.2} fill="url(#crtAmber)" />
                      <Area type="monotone" dataKey="indoor" name="Modeled Indoor Est." stroke="#34D399" strokeWidth={2.2} fill="url(#crtEmerald)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center font-mono text-xs text-slate-400">
                    {aqStatus === 'loading'
                      ? 'SCANNING OPEN-METEO HOURLY AIR QUALITY FORECAST…'
                      : 'HOURLY AIR QUALITY FORECAST DATA UNAVAILABLE'}
                  </div>
                ))}

              {channelIdx === 1 &&
                (hourlyWeatherData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyWeatherData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="hourLabel" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} interval={3} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: 'rgba(52,211,153,0.45)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                      />
                      <Line type="monotone" dataKey="tempC" name="Temperature (°C)" stroke="#F59E0B" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="windKmh" name="Wind Speed (km/h)" stroke="#34D399" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="precipProb" name="Precip Prob (%)" stroke="#38BDF8" strokeWidth={1.8} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center font-mono text-xs text-slate-400">
                    {weatherStatus === 'loading'
                      ? 'SCANNING OPEN-METEO HOURLY WEATHER FORECAST…'
                      : 'HOURLY WEATHER FORECAST DATA UNAVAILABLE'}
                  </div>
                ))}

              {channelIdx === 2 &&
                (chemicalMatrix.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chemicalMatrix} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#E2E8F0', fontSize: 12, fontFamily: 'IBM Plex Mono' }} tickLine={false} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} unit=" µg" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: 'rgba(251,113,133,0.4)',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                      />
                      <Bar dataKey="measured" name="Model Estimate (µg/m³)" fill="#FB7185" radius={[6, 6, 0, 0]} barSize={38} />
                      <Bar dataKey="who" name="WHO 24h Safe Ref (µg/m³)" fill="#34D399" radius={[6, 6, 0, 0]} barSize={38} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center font-mono text-xs text-slate-400">
                    {aqStatus === 'loading'
                      ? 'SCANNING POLLUTANT MASS MATRIX…'
                      : 'POLLUTANT MASS DATA UNAVAILABLE'}
                  </div>
                ))}

              {channelIdx === 3 && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routineDecayData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#E2E8F0', fontSize: 12, fontFamily: 'IBM Plex Mono' }} tickLine={false} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} unit=" µg" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: 'rgba(52,211,153,0.45)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                      formatter={(val: unknown, _name: unknown, item: { payload?: { fullTitle?: string } }) => [
                        `-${val} µg/m³`,
                        item?.payload?.fullTitle || 'Mitigation',
                      ]}
                    />
                    <Bar dataKey="cutUg" name="Modeled PM2.5 Reduction (µg/m³)" fill="#34D399" radius={[6, 6, 0, 0]} barSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
