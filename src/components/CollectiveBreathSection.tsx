import { useState } from 'react';
import { ArrowUp, CheckCircle2, Download, Leaf, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActiveLocation } from '../types/environment';
import { MagneticButton } from './MagneticButton';

interface CollectiveBreathSectionProps {
  location: ActiveLocation;
  householdReductionPct: number;
  onExportPlan: () => void;
}

const NEIGHBORHOOD_SCALES = [
  { id: 'block', label: '100 Households', homes: 100 },
  { id: 'ward', label: '500 Households', homes: 500 },
  { id: 'corridor', label: '2,000 Households', homes: 2000 },
];

export function CollectiveBreathSection({
  location,
  householdReductionPct,
  onExportPlan,
}: CollectiveBreathSectionProps) {
  const [scaleId, setScaleId] = useState<string>('ward');
  const [pledged, setPledged] = useState<boolean>(true);

  const scale =
    NEIGHBORHOOD_SCALES.find((s) => s.id === scaleId) ?? NEIGHBORHOOD_SCALES[1];
  const effectiveHomes = scale.homes + (pledged ? 1 : 0);

  const weeklyCo2AvoidedKg = Math.round(effectiveHomes * 24.5);
  const weeklyNoxAvoidedKg = Number((effectiveHomes * 0.132).toFixed(1));
  const cleanRoomHoursWeekly = effectiveHomes * 56;

  const impactChartData = [
    {
      metric: 'CO2 Avoided (kg/wk)',
      collective: weeklyCo2AvoidedKg,
    },
    {
      metric: 'Protected Hours (×100)',
      collective: Math.round(cleanRoomHoursWeekly / 100),
    },
    {
      metric: 'NOx Cut (kg×10)',
      collective: Math.round(weeklyNoxAvoidedKg * 10),
    },
  ];

  return (
    <>
      <section
        id="section-5"
        aria-label="Section 5 — The Collective Breath"
        className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-6 chapter-reveal">
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-emerald-300">
              05 · The Collective Breath
            </p>
            <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
              When one neighborhood shifts, the canopy clears.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Individual indoor safeguards protect your family tonight. Synchronized transit
              shifts, zero-idling school zones, and elimination of open burning reduce ambient
              street-level plumes across <strong className="text-amber-300">{location.name}</strong>.
            </p>

            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <img
                src="/src/assets/images/aerova_mobility_corridor_1794999308395.jpg"
                alt="Tree-lined electric transit corridor in morning golden light"
                className="w-full h-48 object-cover opacity-80"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
              <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-200">
                <span>Clean Transit Corridor Model</span>
                <span className="text-emerald-300">Modeled Estimate</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-7 chapter-reveal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
                  Neighborhood Participation · Modeled Estimate
                </p>
                <h3 className="mt-1 text-lg font-medium text-slate-50">
                  Simulate collective emissions avoided
                </h3>
              </div>

              <button
                type="button"
                aria-pressed={pledged}
                onClick={() => setPledged((p) => !p)}
                className={`inline-flex items-center gap-2 px-4 py-2 min-h-[42px] rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  pledged
                    ? 'bg-slate-950 border-emerald-400/60 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{pledged ? 'Your Household Pledged' : 'Include Our Household'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Neighborhood scale">
              {NEIGHBORHOOD_SCALES.map((item) => {
                const active = item.id === scale.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScaleId(item.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-400 border-amber-300 text-slate-950 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-400/40'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-800 py-5">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
                  Weekly CO2 Avoided
                </p>
                <p className="mt-1 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-emerald-300">
                  {weeklyCo2AvoidedKg.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-400">kg</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
                  Roadside NOx Cut
                </p>
                <p className="mt-1 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-amber-300">
                  {weeklyNoxAvoidedKg}{' '}
                  <span className="text-xs font-normal text-slate-400">kg / wk</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
                  Household Cut Active
                </p>
                <p className="mt-1 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-slate-50">
                  {householdReductionPct}%
                </p>
              </div>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={impactChartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="metric"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(148,163,184,0.18)' }}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: 'rgba(245,158,11,0.4)',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                  />
                  <Bar
                    dataKey="collective"
                    name={`Projected (${effectiveHomes} homes)`}
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                    barSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section
        id="section-6"
        aria-label="Section 6 — The Future We Breathe"
        className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto text-center"
      >
        <div className="max-w-3xl mx-auto space-y-7 chapter-reveal">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/35 bg-slate-900 text-xs font-mono uppercase tracking-[0.2em] text-amber-300">
            <Leaf className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
            <span>06 · The Future We Breathe</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-light tracking-[-0.025em] leading-[1.06] text-slate-50 text-balance">
            Clear air returns when intelligence becomes daily{' '}
            <span className="italic text-amber-400">stewardship.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Export your personalized household air protocol for {location.name}, share it with your
            family, or return to the horizon to explore another city.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton
              onClick={onExportPlan}
              className="inline-flex items-center gap-2.5 px-7 py-4 min-h-[50px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-semibold transition-colors shadow-[0_0_32px_rgba(245,158,11,0.3)] cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export Family Action Plan</span>
            </MagneticButton>

            <MagneticButton
              href="#hero"
              className="inline-flex items-center gap-2.5 px-6 py-4 min-h-[50px] rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-medium transition-colors"
            >
              <ArrowUp className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              <span>Return to Horizon</span>
            </MagneticButton>
          </div>
        </div>
      </section>
    </>
  );
}
