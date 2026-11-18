import type { ActiveLocation } from '../types/environment';

export interface HouseholdProfile {
  id: string;
  label: string;
  shortLabel: string;
  membersSummary: string;
  clinicalSummary: string;
  safeIndoorPm25Target: number;
  outdoorPlayAllowed: (usAqi: number | null) => { status: string; note: string };
  maskProtocol: string;
}

export interface QuickActionPrompt {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  category: string;
}

export interface MitigationRoutine {
  id: string;
  title: string;
  category: 'Filtration' | 'Envelope' | 'Source Control' | 'Mobility';
  pm25ReductionUg: number;
  effort: 'Low' | 'Medium';
  description: string;
  defaultActive: boolean;
}

export const LOCATION_PRESETS: ActiveLocation[] = [
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    admin1: 'Telangana',
    country: 'India',
    lat: 17.456,
    lon: 78.444,
    timezone: 'Asia/Kolkata',
    source: 'preset',
  },
  {
    id: 'delhi-ncr',
    name: 'New Delhi',
    admin1: 'Delhi',
    country: 'India',
    lat: 28.647,
    lon: 77.316,
    timezone: 'Asia/Kolkata',
    source: 'preset',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    admin1: 'Maharashtra',
    country: 'India',
    lat: 19.065,
    lon: 72.868,
    timezone: 'Asia/Kolkata',
    source: 'preset',
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    admin1: 'Karnataka',
    country: 'India',
    lat: 13.035,
    lon: 77.597,
    timezone: 'Asia/Kolkata',
    source: 'preset',
  },
  {
    id: 'london',
    name: 'London',
    admin1: 'England',
    country: 'United Kingdom',
    lat: 51.5074,
    lon: -0.1278,
    timezone: 'Europe/London',
    source: 'preset',
  },
];

export const HOUSEHOLD_PROFILES: HouseholdProfile[] = [
  {
    id: 'vulnerable-family',
    label: 'Family of 4 including a 5-year-old child and a grandmother with mild chronic bronchitis',
    shortLabel: 'Child (5y) & Grandmother',
    membersSummary: 'High-sensitivity multi-generational home · Pediatric + mild chronic bronchitis protection',
    clinicalSummary:
      'Keep indoor PM2.5 ≤ 25 µg/m³. Suspend outdoor play above US AQI 100; protect grandmother from bronchial irritation and avoid early-morning stagnation commutes.',
    safeIndoorPm25Target: 25,
    outdoorPlayAllowed: (aqi) =>
      aqi === null
        ? { status: 'Data Pending', note: 'Verify air quality estimate before scheduling outdoor play.' }
        : aqi > 150
          ? { status: 'Suspended Indoors', note: 'Keep 5-year-old and grandmother indoors with continuous room filtration.' }
          : aqi > 100
            ? { status: 'Restricted', note: 'Short 15-min low-exertion outdoor breaks only; monitor breathing.' }
            : { status: 'Permitted', note: 'Light outdoor play generally safe under current model estimates.' },
    maskProtocol: 'Child-sized KF94/KN95 + Adult N95 advised for outdoor errands when US AQI > 100.',
  },
  {
    id: 'general-household',
    label: 'General Household',
    shortLabel: 'General Household',
    membersSummary: 'Healthy adults · Standard urban smog exposure mitigation',
    clinicalSummary:
      'Target indoor PM2.5 ≤ 35 µg/m³. Shift outdoor workouts indoors above US AQI 150 and use brief cross-ventilation during lower forecast hours.',
    safeIndoorPm25Target: 35,
    outdoorPlayAllowed: (aqi) =>
      aqi === null
        ? { status: 'Data Pending', note: 'Verify air quality estimate before strenuous exercise.' }
        : aqi > 200
          ? { status: 'Avoid Vigorous Exercise', note: 'Move cardio indoors; wear N95 for outdoor commutes.' }
          : aqi > 100
            ? { status: 'Light Activity Only', note: 'Keep outdoor walks moderate and away from arterial traffic.' }
            : { status: 'Permitted', note: 'Standard outdoor activity acceptable.' },
    maskProtocol: 'Fitted N95 / FFP2 recommended for high-traffic or two-wheeler commutes.',
  },
  {
    id: 'respiratory-care',
    label: 'Asthma, COPD & Pregnancy Care',
    shortLabel: 'Respiratory & Maternal Care',
    membersSummary: 'Clinical-grade clean air room priority · Zero unmasked smog exposure',
    clinicalSummary:
      'Maintain primary bedroom ≤ 15 µg/m³ with continuous HEPA + carbon filtration and 40–50% indoor relative humidity.',
    safeIndoorPm25Target: 15,
    outdoorPlayAllowed: (aqi) =>
      aqi === null
        ? { status: 'Precaution', note: 'Keep rescue medication accessible while air telemetry loads.' }
        : aqi > 100
          ? { status: 'Stay Indoors', note: 'Avoid unmasked outdoor exposure; keep rescue medication accessible.' }
          : { status: 'Caution', note: 'Brief midday walks only if completely asymptomatic.' },
    maskProtocol: 'Valveless N95 respirator required for any outdoor step above US AQI 100.',
  },
  {
    id: 'school-commute',
    label: 'School-Age Kids & Daily Commuters',
    shortLabel: 'School Commute & Teens',
    membersSummary: 'Peak rush-hour transit protection · Classroom & sports scheduling',
    clinicalSummary:
      'Morning commute coincides with peak traffic NO2 and boundary-layer PM2.5. Enforce cabin air recirculation or fitted KF94 masks.',
    safeIndoorPm25Target: 30,
    outdoorPlayAllowed: (aqi) =>
      aqi === null
        ? { status: 'Data Pending', note: 'Verify live US AQI estimate before outdoor PE.' }
        : aqi > 150
          ? { status: 'Indoor PE Only', note: 'Request indoor sports alternatives; suspend after-school field practice.' }
          : aqi > 100
            ? { status: 'Modified Schedule', note: 'Favor lower-traffic midday hours and hydrate frequently.' }
            : { status: 'Permitted', note: 'Standard schoolyard sports acceptable.' },
    maskProtocol: 'Well-sealed KF94 / N95 during bus stops, walks, and rush-hour commutes.',
  },
];

export const QUICK_ACTION_PROMPTS: QuickActionPrompt[] = [
  {
    id: 'ventilation',
    title: 'Safe Ventilation Hours',
    subtitle: 'Optimal open & seal schedule from today’s forecast curve',
    category: 'Ventilation',
    prompt:
      'Based on today’s Open-Meteo hourly PM2.5 forecast, wind speed, precipitation, and my household profile, when are the relatively safer minutes to briefly ventilate our home, and how should we seal rooms afterward?',
  },
  {
    id: 'indoor-plants',
    title: 'Best Indoor Air-Purifying Plants',
    subtitle: 'Evidence-based botanical helpers vs. HEPA particulate filtration',
    category: 'Indoor Air',
    prompt:
      'Which indoor air-purifying plants are safest and most practical for our household during elevated smog, what gases do they modestly assist with, and how should we pair them with real particulate filtration?',
  },
  {
    id: 'outdoor-play',
    title: 'Outdoor Play Risk Assessment',
    subtitle: 'Pediatric & chronic-bronchitis safety check for current estimates',
    category: 'Family Safety',
    prompt:
      'Can our 5-year-old child go outside to play today given the current US AQI and weather conditions, and what indoor movement alternatives keep our household safe without stirring up settled soot?',
  },
  {
    id: 'diy-purifier',
    title: 'DIY Corsi-Rosenthal Guide',
    subtitle: 'Low-cost box fan + MERV-13 build for clean-air bedrooms',
    category: 'Filtration',
    prompt:
      'Give me a practical, budget-friendly step-by-step guide to building a DIY Corsi-Rosenthal box-fan air purifier for one bedroom, including placement and maintenance cues.',
  },
];

export const MITIGATION_ROUTINES: MitigationRoutine[] = [
  {
    id: 'hepa-continuous',
    title: 'Continuous HEPA / DIY Box-Fan Air Purifier',
    category: 'Filtration',
    pm25ReductionUg: 56,
    effort: 'Low',
    description: 'Run bedroom purifier continuously on medium-high with doors closed to sustain a clean-air sleep zone.',
    defaultActive: true,
  },
  {
    id: 'seal-gaskets',
    title: 'Seal Window Gaps & Exterior Door Sweeps',
    category: 'Envelope',
    pm25ReductionUg: 22,
    effort: 'Low',
    description: 'Block nocturnal smog infiltration with rolled damp towels or weatherstripping foam tape.',
    defaultActive: true,
  },
  {
    id: 'wet-mop',
    title: 'Wet-Mop Floors Instead of Dry Sweeping',
    category: 'Source Control',
    pm25ReductionUg: 14,
    effort: 'Low',
    description: 'Prevents resuspending settled ultrafine soot particles into children’s breathing height.',
    defaultActive: true,
  },
  {
    id: 'exhaust-cooking',
    title: 'Covered Pots + Range Hood / Induction Cooking',
    category: 'Source Control',
    pm25ReductionUg: 18,
    effort: 'Medium',
    description: 'Eliminates indoor frying & NO2 spikes that compound outdoor air pollution inside kitchens.',
    defaultActive: false,
  },
  {
    id: 'zero-combustion',
    title: 'Zero Indoor Incense, Candles & Mosquito Coils',
    category: 'Source Control',
    pm25ReductionUg: 15,
    effort: 'Low',
    description: 'Indoor combustion sources can spike room PM2.5 above 300 µg/m³ for hours.',
    defaultActive: true,
  },
  {
    id: 'transit-shift',
    title: 'Consolidate Errands & Car Cabin Recirculation',
    category: 'Mobility',
    pm25ReductionUg: 11,
    effort: 'Medium',
    description: 'Avoid morning rush-hour walks and switch vehicle HVAC to recirculate mode in traffic.',
    defaultActive: false,
  },
];

export interface CommuteMode {
  id: string;
  label: string;
  tagline: string;
  inhalationReductionPct: number;
  weeklyCo2SavedKg: number;
  weeklyNoxAvoidedG: number;
  guidance: string;
}

export const COMMUTE_MODES: CommuteMode[] = [
  {
    id: 'electric-metro',
    label: 'Electric Metro & Covered Walk',
    tagline: 'Lowest street-canyon NO2 exposure · Zero tailpipe emissions',
    inhalationReductionPct: 68,
    weeklyCo2SavedKg: 28.4,
    weeklyNoxAvoidedG: 142,
    guidance:
      'Wear a fitted N95/KF94 for the walk to the station when US AQI > 100; enclosed rail cars reduce roadside diesel plume inhalation.',
  },
  {
    id: 'filtered-ev-carpool',
    label: 'HEPA-Cabin Carpool / EV Share',
    tagline: 'Cabin recirculation mode cuts highway NO2 & soot by over 60%',
    inhalationReductionPct: 62,
    weeklyCo2SavedKg: 19.2,
    weeklyNoxAvoidedG: 98,
    guidance:
      'Keep HVAC on internal recirculation at traffic signals and combine school + office trips to eliminate cold-start idling.',
  },
  {
    id: 'midday-greenway',
    label: 'Midday Greenway Cycle / Walk',
    tagline: 'Timed to relatively lower midday particulate window away from arterial roads',
    inhalationReductionPct: 44,
    weeklyCo2SavedKg: 24.0,
    weeklyNoxAvoidedG: 118,
    guidance:
      'Recommended only when US AQI is below 150 (or < 100 for sensitive individuals), wearing a well-sealed N95 along tree-lined corridors.',
  },
];

export interface ActivitySlot {
  id: string;
  window: string;
  phase: string;
  verdict: 'Indoors Priority' | 'Brief Ventilation' | 'Sealed Sleep Zone';
  recommendation: string;
}

export function buildCleanAirSchedule(params: {
  saferWindowLabel: string | null;
  usAqi: number | null;
  profile: HouseholdProfile;
  safeIndoorTarget: number;
}): ActivitySlot[] {
  const isSensitive =
    params.profile.id === 'vulnerable-family' || params.profile.id === 'respiratory-care';
  const highPollution = params.usAqi !== null && params.usAqi > 150;
  const ventWindow = params.saferWindowLabel || '13:00 – 15:00';

  return [
    {
      id: 'morning-stagnation',
      window: '06:00 – 10:30',
      phase: 'Morning Boundary Stagnation',
      verdict: 'Indoors Priority',
      recommendation:
        isSensitive || highPollution
          ? 'Keep windows latched, run bedroom HEPA/box-fan on medium, and serve warm fluids indoors; postpone vigorous outdoor play.'
          : 'Check current Open-Meteo hourly forecast before morning runs; favor low-traffic side streets.',
    },
    {
      id: 'midday-purge',
      window: ventWindow,
      phase: 'Relatively Lower Forecast Window',
      verdict: 'Brief Ventilation',
      recommendation:
        'Open cross-facing windows briefly (10–15 min) to flush indoor CO2—note this is a lower-concentration window, not pollution-free—then close and resume filtration.',
    },
    {
      id: 'evening-accumulation',
      window: '16:30 – 22:00',
      phase: 'Evening Rush & Cooling',
      verdict: 'Indoors Priority',
      recommendation:
        'Switch kitchen exhaust on during cooking, wet-mop high-traffic floors, and avoid incense or candle combustion.',
    },
    {
      id: 'night-recovery',
      window: '22:00 – 06:00',
      phase: 'Overnight Recovery',
      verdict: 'Sealed Sleep Zone',
      recommendation: `Seal exterior door sweeps and sustain continuous filtration toward ≤ ${params.safeIndoorTarget} µg/m³.`,
    },
  ];
}
