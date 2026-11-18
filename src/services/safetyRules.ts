export type HealthSeverity = 'good' | 'moderate' | 'sensitive' | 'poor' | 'very-poor' | 'severe';

export interface DeterministicSafetyGuidance {
  usAqiBand: string;
  europeanAqiBand: string;
  severity: HealthSeverity;
  outdoorActivityRule: string;
  sensitiveGroupRule: string;
  ventilationRule: string;
  maskGuidance: string;
  saferWindowLabel: string | null;
}

export function classifyUsAqi(aqi: number | null): {
  band: string;
  severity: HealthSeverity;
  outdoorGuidance: string;
  sensitiveGuidance: string;
  maskProtocol: string;
} {
  if (aqi === null || !Number.isFinite(aqi) || aqi < 0) {
    return {
      band: 'Data unavailable',
      severity: 'moderate',
      outdoorGuidance: 'Live US AQI estimate unavailable. Check local guidance before strenuous outdoor activity.',
      sensitiveGuidance: 'Keep rescue inhalers accessible and monitor breathing symptoms indoors.',
      maskProtocol: 'Keep fitted N95/KF94 respirators ready if smoke or haze is visible.',
    };
  }
  if (aqi >= 301) {
    return {
      band: 'Hazardous (US AQI 301+)',
      severity: 'severe',
      outdoorGuidance: 'Avoid all non-essential outdoor exertion; move children’s play and exercise strictly indoors.',
      sensitiveGuidance: 'High risk of acute airway inflammation for children, older adults, asthma, and chronic bronchitis. Maintain sealed indoor clean-air rooms.',
      maskProtocol: 'Fitted valveless N95 / FFP2 (or child-sized KF94) required for any outdoor errand.',
    };
  }
  if (aqi >= 201) {
    return {
      band: 'Very Unhealthy (US AQI 201–300)',
      severity: 'very-poor',
      outdoorGuidance: 'Avoid prolonged or heavy outdoor exertion; keep outdoor breaks brief and low-intensity.',
      sensitiveGuidance: 'Sensitive households (pediatric, elderly, asthma/COPD) should stay indoors with continuous filtration.',
      maskProtocol: 'Well-sealed N95 / KN95 recommended during street transit or walks.',
    };
  }
  if (aqi >= 151) {
    return {
      band: 'Unhealthy (US AQI 151–200)',
      severity: 'poor',
      outdoorGuidance: 'Reduce prolonged outdoor exertion; relocate high-intensity sports indoors.',
      sensitiveGuidance: 'Children, older adults, and respiratory-sensitive individuals should suspend outdoor play.',
      maskProtocol: 'Fitted KF94 / N95 advised near heavy traffic corridors.',
    };
  }
  if (aqi >= 101) {
    return {
      band: 'Unhealthy for Sensitive Groups (US AQI 101–150)',
      severity: 'sensitive',
      outdoorGuidance: 'General healthy adults may stay active with lighter intensity; avoid roadside exertion.',
      sensitiveGuidance: 'Limit prolonged outdoor play for young children and elderly family members with bronchitis or asthma.',
      maskProtocol: 'Keep KF94/N95 masks handy for rush-hour commuting.',
    };
  }
  if (aqi >= 51) {
    return {
      band: 'Moderate (US AQI 51–100)',
      severity: 'moderate',
      outdoorGuidance: 'Outdoor activity generally acceptable for most people; monitor very sensitive individuals.',
      sensitiveGuidance: 'Unusually sensitive respiratory patients should watch for cough or shortness of breath.',
      maskProtocol: 'Optional; helpful along high-diesel traffic arterial roads.',
    };
  }
  return {
    band: 'Good (US AQI 0–50)',
    severity: 'good',
    outdoorGuidance: 'Outdoor activity is generally favorable based on current model estimates.',
    sensitiveGuidance: 'Standard precautions apply; monitor personal symptoms if triggers are present.',
    maskProtocol: 'No particulate respirator typically required outdoors.',
  };
}

export function classifyEuropeanAqi(eaqi: number | null): string {
  if (eaqi === null || !Number.isFinite(eaqi) || eaqi < 0) return 'Data unavailable';
  if (eaqi > 100) return 'Extremely Poor (EAQI > 100)';
  if (eaqi > 80) return 'Very Poor (EAQI 81–100)';
  if (eaqi > 60) return 'Poor (EAQI 61–80)';
  if (eaqi > 40) return 'Moderate (EAQI 41–60)';
  if (eaqi > 20) return 'Fair (EAQI 21–40)';
  return 'Good (EAQI 0–20)';
}

export function computeSaferActivityWindow(
  hourlyAq: Array<{ timeIso: string; hourLabel: string; pm25: number | null; usAqi: number | null }>
): { windowLabel: string; startHour: number; endHour: number } | null {
  const daytimeCandidates = hourlyAq
    .slice(0, 24)
    .map((slot, idx) => {
      const parsedHour = Number(slot.hourLabel.slice(0, 2));
      const hour = Number.isFinite(parsedHour) ? parsedHour : idx;
      return { hour, label: slot.hourLabel, pm25: slot.pm25, usAqi: slot.usAqi };
    })
    .filter((s) => s.hour >= 10 && s.hour <= 17 && s.pm25 !== null);

  if (daytimeCandidates.length < 2) return null;

  let bestIdx = 0;
  let bestAvg = Infinity;
  for (let i = 0; i < daytimeCandidates.length - 1; i++) {
    const avg = ((daytimeCandidates[i].pm25 ?? 999) + (daytimeCandidates[i + 1].pm25 ?? 999)) / 2;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestIdx = i;
    }
  }

  const start = daytimeCandidates[bestIdx];
  const end = daytimeCandidates[Math.min(bestIdx + 2, daytimeCandidates.length - 1)];
  const endHourNum = Math.max(start.hour + 1, end.hour);
  return {
    windowLabel: `${String(start.hour).padStart(2, '0')}:00 – ${String(endHourNum).padStart(2, '0')}:00`,
    startHour: start.hour,
    endHour: endHourNum,
  };
}

export function buildDeterministicSafetyBrief(params: {
  usAqi: number | null;
  europeanAqi: number | null;
  windKmh: number | null;
  precipitationMm: number | null;
  saferWindowLabel: string | null;
  safeIndoorPm25Target: number;
}): DeterministicSafetyGuidance {
  const us = classifyUsAqi(params.usAqi);
  const euBand = classifyEuropeanAqi(params.europeanAqi);

  let ventilationRule =
    'Ventilation window could not be determined from available hourly air-quality forecasts; keep windows sealed if outdoor haze is present.';
  if (params.saferWindowLabel) {
    if (params.usAqi !== null && params.usAqi >= 201) {
      ventilationRule = `High ambient burden: avoid prolonged open windows. Restrict brief cross-ventilation (10–15 min max for CO2 purge) to the relatively lower-forecast window (${params.saferWindowLabel}), then re-seal rooms and run filtration toward ≤ ${params.safeIndoorPm25Target} µg/m³. Lower forecast hours are NOT pollution-free.`;
    } else if (params.usAqi !== null && params.usAqi >= 101) {
      ventilationRule = `Moderate-to-unhealthy ambient levels: favor short 15–20 min cross-ventilation during ${params.saferWindowLabel} when modeled particulates dip, while keeping active indoor filtration ready.`;
    } else {
      ventilationRule = `Cross-ventilation is generally favorable during ${params.saferWindowLabel}, though conditions still reflect model estimates rather than hyperlocal street sensors.`;
    }
  }

  if (params.windKmh !== null && params.windKmh <= 6) {
    ventilationRule += ' Low surface wind (≤ 6 km/h) slows pollutant dispersion regardless of temperature.';
  }
  if (params.precipitationMm !== null && params.precipitationMm > 0.2) {
    ventilationRule += ' Light precipitation may settle coarse road dust slightly, but weather alone never guarantees safe AQI.';
  }

  return {
    usAqiBand: us.band,
    europeanAqiBand: euBand,
    severity: us.severity,
    outdoorActivityRule: us.outdoorGuidance,
    sensitiveGroupRule: us.sensitiveGuidance,
    ventilationRule,
    maskGuidance: us.maskProtocol,
    saferWindowLabel: params.saferWindowLabel,
  };
}
