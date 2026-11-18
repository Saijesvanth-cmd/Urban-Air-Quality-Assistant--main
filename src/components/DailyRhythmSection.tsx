import { useState } from 'react';
import { Check, Clock, Home, Train, Wind } from 'lucide-react';
import {
  buildCleanAirSchedule,
  COMMUTE_MODES,
  type HouseholdProfile,
  type MitigationRoutine,
} from '../data/airQualityData';
import type { ActiveLocation } from '../types/environment';

interface DailyRhythmSectionProps {
  location: ActiveLocation;
  usAqi: number | null;
  outdoorPm25: number | null;
  saferWindowLabel: string | null;
  profile: HouseholdProfile;
  activeSafetyTarget: number;
  householdShortLabel: string;
  routines: MitigationRoutine[];
  activeRoutineIds: string[];
  onToggleRoutine: (id: string) => void;
  estimatedIndoorPm25: number | null;
  totalReductionPct: number;
}

export function DailyRhythmSection({
  location,
  usAqi,
  outdoorPm25,
  saferWindowLabel,
  profile,
  activeSafetyTarget,
  householdShortLabel,
  routines,
  activeRoutineIds,
  onToggleRoutine,
  estimatedIndoorPm25,
  totalReductionPct,
}: DailyRhythmSectionProps) {
  const [selectedCommuteId, setSelectedCommuteId] = useState<string>(COMMUTE_MODES[0].id);

  const schedule = buildCleanAirSchedule({
    saferWindowLabel,
    usAqi,
    profile,
    safeIndoorTarget: activeSafetyTarget,
  });
  const commute = COMMUTE_MODES.find((c) => c.id === selectedCommuteId) ?? COMMUTE_MODES[0];
  const meetsTarget = estimatedIndoorPm25 !== null && estimatedIndoorPm25 <= activeSafetyTarget;

  return (
    <section
      id="section-4"
      aria-label="Section 4 — A Better Daily Rhythm"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-12"
    >
      <div className="max-w-2xl space-y-3 chapter-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-emerald-300">
          04 · A Better Daily Rhythm
        </p>
        <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
          Move in step with the atmosphere.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Clean air at home combines timing, sealed sleeping zones, and low-emission transit. Note
          that lower forecast periods reduce relative exposure and are never completely
          pollution-free.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start chapter-reveal">
        <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <h3 className="text-base sm:text-lg font-medium text-slate-50">
                24-Hour Family Rhythm · {location.name}
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-300">{householdShortLabel}</span>
          </div>

          <ol className="mt-6 space-y-6">
            {schedule.map((slot, index) => {
              const isVentWindow = slot.verdict === 'Brief Ventilation';
              return (
                <li
                  key={slot.id}
                  className="relative pl-7 border-l border-slate-800 last:border-l-transparent pb-1"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${
                      isVentWindow ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono tabular-nums text-amber-300">
                      {String(index + 1).padStart(2, '0')} · {slot.window}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                        isVentWindow
                          ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-300'
                          : 'border-slate-700 bg-slate-950 text-slate-300'
                      }`}
                    >
                      {slot.verdict}
                    </span>
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-medium text-slate-100">
                    {slot.phase}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {slot.recommendation}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <img
              src="/src/assets/images/aerova_interior_sanctuary_1794999308077.jpg"
              alt="Sunlit indoor sanctuary with air filtration and biophilic greenery"
              className="w-full h-52 object-cover opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-300">
                  Indoor Sanctuary Estimate
                </p>
                <p className="text-lg font-mono tabular-nums text-slate-50 mt-0.5">
                  {estimatedIndoorPm25 !== null ? (
                    <>
                      {estimatedIndoorPm25} µg/m³{' '}
                      <span className="text-xs text-slate-300">
                        ({totalReductionPct}% modeled cut)
                      </span>
                    </>
                  ) : (
                    'Data unavailable'
                  )}
                </p>
              </div>
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                  meetsTarget
                    ? 'border-emerald-400/45 bg-slate-950/90 text-emerald-300'
                    : 'border-amber-400/45 bg-slate-950/90 text-amber-300'
                }`}
              >
                {meetsTarget ? 'Target Met' : `Goal ≤ ${activeSafetyTarget}`}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Train className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-base font-medium text-slate-50">Low-Exposure Commute Mode</h3>
            </div>

            <div className="space-y-2">
              {COMMUTE_MODES.map((mode) => {
                const selected = mode.id === commute.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedCommuteId(mode.id)}
                    className={`w-full text-left px-4 py-3 min-h-[48px] rounded-xl border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-950 border-emerald-400/55 text-slate-50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-semibold">{mode.label}</span>
                      <span className="text-xs font-mono tabular-nums text-emerald-300">
                        −{mode.inhalationReductionPct}% inhaled
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{mode.tagline}</p>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-1 border-t border-slate-800">
              {commute.guidance}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 chapter-reveal">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-amber-400">
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Interactive Protection Checklist · Modeled Estimate</span>
            </div>
            <h3 className="mt-1 text-lg sm:text-xl font-medium text-slate-50">
              Daily low-emission & filtration habits
            </h3>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-300">
              Outdoor {outdoorPm25 !== null ? `${outdoorPm25} µg/m³` : 'Unavailable'}
            </span>
            <Wind className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/40 text-emerald-300">
              Indoor {estimatedIndoorPm25 !== null ? `~${estimatedIndoorPm25} µg/m³` : 'Unavailable'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {routines.map((routine) => {
            const active = activeRoutineIds.includes(routine.id);
            return (
              <button
                key={routine.id}
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => onToggleRoutine(routine.id)}
                className={`text-left p-4 min-h-[104px] rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  active
                    ? 'bg-slate-950 border-emerald-400/50 text-slate-50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">
                      {routine.category}
                    </span>
                    <p className="text-sm font-medium mt-0.5 leading-snug text-slate-100">
                      {routine.title}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-emerald-400 border-emerald-400 text-slate-950'
                        : 'border-slate-700 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-400 line-clamp-2">{routine.description}</span>
                  <span className="font-mono tabular-nums text-amber-300 shrink-0">
                    −{routine.pm25ReductionUg} µg
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
