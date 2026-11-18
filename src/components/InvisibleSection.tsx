import { useState } from 'react';
import type { ActiveLocation } from '../types/environment';
import type { AirQualitySnapshot } from '../services/airQualityService';
import type { WeatherSnapshot } from '../services/weatherService';

interface InvisibleSectionProps {
  location: ActiveLocation;
  weather: WeatherSnapshot | null;
  airQuality: AirQualitySnapshot | null;
}

interface PollutantSpec {
  id: 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co';
  formula: string;
  name: string;
  diameterLabel: string;
  scalePx: number;
  whoLimit: number;
  unit: string;
  color: string;
  origin: string;
  biology: string;
}

const POLLUTANTS: PollutantSpec[] = [
  {
    id: 'pm25',
    formula: 'PM2.5',
    name: 'Fine Respirable Particulates',
    diameterLabel: '≤ 2.5 µm (1/28th width of human hair)',
    scalePx: 14,
    whoLimit: 15,
    unit: 'µg/m³',
    color: '#FB7185',
    origin:
      'Thermal inversion and combustion emissions trap vehicle soot, biomass smoke, and sulfate aerosols close to street level.',
    biology:
      'Small enough to bypass nasal cilia, penetrate deep lung alveoli, and trigger systemic airway inflammation.',
  },
  {
    id: 'pm10',
    formula: 'PM10',
    name: 'Coarse Inhalable Dust',
    diameterLabel: '≤ 10 µm (1/7th width of human hair)',
    scalePx: 30,
    whoLimit: 45,
    unit: 'µg/m³',
    color: '#F59E0B',
    origin: 'Road dust resuspension, urban construction, and dry wind abrasion.',
    biology:
      'Settles in the upper bronchi and throat, aggravating chronic bronchitis and pediatric coughing.',
  },
  {
    id: 'no2',
    formula: 'NO2',
    name: 'Nitrogen Dioxide',
    diameterLabel: 'Molecular gas · Roadside plume',
    scalePx: 9,
    whoLimit: 25,
    unit: 'µg/m³',
    color: '#FBBF24',
    origin:
      'Rush-hour diesel exhaust, idling traffic at intersections, and indoor unvented gas stoves.',
    biology:
      'Irritates airway linings rapidly, heightening bronchial sensitivity to allergens and respiratory infections.',
  },
  {
    id: 'o3',
    formula: 'O3',
    name: 'Ground-Level Ozone',
    diameterLabel: 'Photochemical oxidant gas',
    scalePx: 11,
    whoLimit: 60,
    unit: 'µg/m³',
    color: '#34D399',
    origin: 'Formed when sunlight reacts with traffic NOx and volatile organic compounds.',
    biology:
      'Oxidizes lung surfactant membranes during outdoor exertion, reducing deep-breath capacity.',
  },
  {
    id: 'so2',
    formula: 'SO2',
    name: 'Sulphur Dioxide',
    diameterLabel: 'Acidic industrial & fuel gas',
    scalePx: 10,
    whoLimit: 40,
    unit: 'µg/m³',
    color: '#A78BFA',
    origin: 'Heavy diesel combustion, coal power generation, and industrial smelting plumes.',
    biology:
      'Causes rapid bronchoconstriction in people with asthma even during brief outdoor exposure.',
  },
  {
    id: 'co',
    formula: 'CO',
    name: 'Carbon Monoxide',
    diameterLabel: 'Colorless incomplete combustion gas',
    scalePx: 8,
    whoLimit: 4000,
    unit: 'µg/m³',
    color: '#38BDF8',
    origin: 'Incomplete fuel burning in congested traffic, generators, and unvented stoves.',
    biology:
      'Binds hemoglobin tightly, lowering oxygen delivery to heart muscle and developing fetal/pediatric tissues.',
  },
];

export function InvisibleSection({ location, weather, airQuality }: InvisibleSectionProps) {
  const [activeId, setActiveId] = useState<PollutantSpec['id']>('pm25');

  const getCityValue = (id: PollutantSpec['id']): number | null => {
    if (!airQuality) return null;
    switch (id) {
      case 'pm25':
        return airQuality.current.pm25;
      case 'pm10':
        return airQuality.current.pm10;
      case 'no2':
        return airQuality.current.no2;
      case 'o3':
        return airQuality.current.o3;
      case 'so2':
        return airQuality.current.so2;
      case 'co':
        return airQuality.current.co;
    }
  };

  const active = POLLUTANTS.find((p) => p.id === activeId) ?? POLLUTANTS[0];
  const currentValue = getCityValue(active.id);
  const ratioVsWho = currentValue !== null ? (currentValue / active.whoLimit).toFixed(2) : null;
  const windKmh = weather?.current.windSpeedKmh ?? null;
  const tempC = weather?.current.temperatureC ?? null;

  return (
    <section
      id="section-1"
      aria-label="Section 1 — The Invisible"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <div className="lg:col-span-5 space-y-6 chapter-reveal">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-amber-400">
            01 · The Invisible Layer
          </p>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
            What floats unseen above the skyline.
          </h2>
          <p className="text-base text-slate-300 leading-relaxed">
            Surface wind ({windKmh !== null ? `${windKmh} km/h` : 'unavailable'}) and boundary
            mixing influence how rapidly emissions disperse, though weather alone never guarantees
            safe air quality. Inspect each atmospheric constituent below.
          </p>
          <p className="text-xs font-mono text-slate-400 leading-relaxed border-l-2 border-amber-400/55 pl-4">
            Values reflect Open-Meteo regional model estimates (CAMS assimilation) for{' '}
            {location.name} ({location.lat.toFixed(3)}, {location.lon.toFixed(3)}) — not physical
            ground-station sensors.
          </p>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <img
              src="/src/assets/images/aerova_hero_skyline_1794999306882.jpg"
              alt="Misty urban skyline under winter atmospheric inversion"
              className="w-full h-44 object-cover opacity-70 saturate-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-200">
              <span>Atmospheric Layer Model</span>
              <span className="tabular-nums text-amber-300">
                {location.name} · {tempC !== null ? `${tempC}°C` : 'Temp unavailable'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-7 chapter-reveal">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
                Interactive Pollutant Lens
              </p>
              <h3 className="mt-1 text-lg font-medium text-slate-50">
                Inspect particle scale & physiological entry
              </h3>
            </div>

            <div role="tablist" aria-label="Atmospheric pollutants" className="flex flex-wrap gap-2">
              {POLLUTANTS.map((item) => {
                const selected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveId(item.id)}
                    className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                      selected
                        ? 'bg-amber-400 text-slate-950 font-semibold shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-amber-400/40'
                    }`}
                  >
                    {item.formula}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-2xl sm:text-3xl font-mono font-semibold tabular-nums"
                    style={{ color: currentValue !== null ? active.color : '#94A3B8' }}
                  >
                    {currentValue !== null ? currentValue : 'Data unavailable'}
                  </span>
                  {currentValue !== null && (
                    <span className="text-xs font-mono text-slate-400">{active.unit}</span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-100">{active.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{active.diameterLabel}</p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-400">
                  WHO 24h Reference
                </p>
                <p className="mt-1 text-sm font-mono tabular-nums text-slate-200">
                  {active.whoLimit} {active.unit}{' '}
                  {ratioVsWho !== null && (
                    <span className="text-amber-300">({ratioVsWho}× ref)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-16 h-16 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span className="text-[10px] font-mono text-slate-400">70 µm</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Human Hair</span>
                </div>

                <div className="text-slate-600 font-mono text-xs" aria-hidden="true">
                  vs.
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <span
                      className="rounded-full block transition-all duration-300"
                      style={{
                        width: `${active.scalePx}px`,
                        height: `${active.scalePx}px`,
                        backgroundColor: active.color,
                        boxShadow: `0 0 22px ${active.color}88`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-100">{active.formula}</span>
                </div>
              </div>

              <div className="flex-1 min-w-[220px] space-y-3 text-sm leading-relaxed">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 block">
                    Urban Source
                  </span>
                  <p className="text-slate-300 mt-0.5">{active.origin}</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 block">
                    Biological Pathway
                  </span>
                  <p className="text-slate-300 mt-0.5">{active.biology}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
