import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  HOUSEHOLD_PROFILES,
  LOCATION_PRESETS,
  MITIGATION_ROUTINES,
  QUICK_ACTION_PROMPTS,
} from './data/airQualityData';
import type { ActiveLocation, AsyncFetchStatus } from './types/environment';
import type { WeatherSnapshot } from './services/weatherService';
import type { AirQualitySnapshot } from './services/airQualityService';
import {
  getAirQualityForCoordinates,
  getWeatherForCoordinates,
  loadEnvironmentalBundle,
} from './services/environmentalDataService';
import { detectBrowserLocation } from './services/geolocationService';
import {
  buildDeterministicSafetyBrief,
  computeSaferActivityWindow,
} from './services/safetyRules';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AtmosphereScene } from './components/AtmosphereScene';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { InvisibleSection } from './components/InvisibleSection';
import { UnderstandAirSection } from './components/UnderstandAirSection';
import { RetroCrtCarousel } from './components/RetroCrtCarousel';
import { AtmosphericMapSection } from './components/AtmosphericMapSection';
import { HouseholdDbPanel } from './components/HouseholdDbPanel';
import { AiAssistantChat, type ChatMessage } from './components/AiAssistantChat';
import { DailyRhythmSection } from './components/DailyRhythmSection';
import { CollectiveBreathSection } from './components/CollectiveBreathSection';

function formatTimeNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function DashboardApp() {
  const {
    user,
    dbProfiles,
    dbRoutines,
    recordDbQuery,
    updatePreferredCityInFirestore,
  } = useAuth();

  const [location, setLocation] = useState<ActiveLocation>(LOCATION_PRESETS[0]);
  const [recentLocations, setRecentLocations] = useState<ActiveLocation[]>([]);
  const [locationDetectStatus, setLocationDetectStatus] = useState<
    'idle' | 'detecting' | 'success' | 'error'
  >('idle');
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<AsyncFetchStatus>('loading');
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [airQuality, setAirQuality] = useState<AirQualitySnapshot | null>(null);
  const [aqStatus, setAqStatus] = useState<AsyncFetchStatus>('loading');
  const [aqError, setAqError] = useState<string | null>(null);

  const [selectedProfileId, setSelectedProfileId] = useState<string>(HOUSEHOLD_PROFILES[0].id);
  const [activeRoutineIds, setActiveRoutineIds] = useState<string[]>(() =>
    MITIGATION_ROUTINES.filter((r) => r.defaultActive).map((r) => r.id)
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Monotonic epoch prevents stale geolocation/search responses from overwriting newer selections
  const locationEpochRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchForLocation = useCallback(
    async (
      targetLoc: ActiveLocation,
      options?: { forceRefresh?: boolean; mode?: 'both' | 'weather' | 'aq' }
    ) => {
      const mode = options?.mode ?? 'both';
      const epoch = locationEpochRef.current;

      if (mode === 'both') {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setWeatherStatus('loading');
        setWeatherError(null);
        setAqStatus('loading');
        setAqError(null);

        const result = await loadEnvironmentalBundle(targetLoc.lat, targetLoc.lon, {
          forceRefresh: options?.forceRefresh,
          signal: controller.signal,
        });

        if (epoch !== locationEpochRef.current || controller.signal.aborted) {
          return;
        }

        if (result.weather) {
          setWeather(result.weather);
          setWeatherStatus('success');
          setWeatherError(null);
          if (result.weather.timezone && targetLoc.timezone === 'auto') {
            setLocation((prev) =>
              prev.id === targetLoc.id ? { ...prev, timezone: result.weather!.timezone } : prev
            );
          }
        } else {
          setWeather(null);
          setWeatherStatus('error');
          setWeatherError(result.weatherError || 'Unable to fetch Open-Meteo weather data.');
        }

        if (result.airQuality) {
          setAirQuality(result.airQuality);
          setAqStatus('success');
          setAqError(null);
        } else {
          setAirQuality(null);
          setAqStatus('error');
          setAqError(result.airQualityError || 'Unable to fetch Open-Meteo air quality estimates.');
        }
        return;
      }

      if (mode === 'weather') {
        setWeatherStatus('loading');
        setWeatherError(null);
        try {
          const snap = await getWeatherForCoordinates(targetLoc.lat, targetLoc.lon, {
            forceRefresh: options?.forceRefresh ?? true,
          });
          if (epoch !== locationEpochRef.current) return;
          setWeather(snap);
          setWeatherStatus('success');
        } catch (err) {
          if (epoch !== locationEpochRef.current) return;
          setWeatherStatus('error');
          setWeatherError(
            err instanceof Error ? err.message : 'Unable to refresh weather telemetry.'
          );
        }
        return;
      }

      if (mode === 'aq') {
        setAqStatus('loading');
        setAqError(null);
        try {
          const snap = await getAirQualityForCoordinates(targetLoc.lat, targetLoc.lon, {
            forceRefresh: options?.forceRefresh ?? true,
          });
          if (epoch !== locationEpochRef.current) return;
          setAirQuality(snap);
          setAqStatus('success');
        } catch (err) {
          if (epoch !== locationEpochRef.current) return;
          setAqStatus('error');
          setAqError(
            err instanceof Error ? err.message : 'Unable to refresh air quality estimates.'
          );
        }
      }
    },
    []
  );

  // Trigger live Open-Meteo fetch on mount & whenever active location changes
  useEffect(() => {
    locationEpochRef.current += 1;
    void fetchForLocation(location, { mode: 'both' });
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [location.id, location.lat, location.lon, fetchForLocation]);

  // Background refresh every 10 minutes while tab is visible
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) {
        void fetchForLocation(location, { forceRefresh: true, mode: 'both' });
      }
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [location, fetchForLocation]);

  const handleSelectLocation = useCallback(
    (nextLoc: ActiveLocation) => {
      setLocationDetectError(null);
      setLocation(nextLoc);
      setRecentLocations((prev) => {
        const filtered = prev.filter(
          (item) =>
            item.id !== nextLoc.id &&
            !(
              Math.abs(item.lat - nextLoc.lat) < 0.01 &&
              Math.abs(item.lon - nextLoc.lon) < 0.01
            )
        );
        return [nextLoc, ...filtered].slice(0, 5);
      });
      if (user) {
        const safeId = nextLoc.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
        if (safeId) {
          void updatePreferredCityInFirestore(safeId).catch(() => {});
        }
      }
    },
    [user, updatePreferredCityInFirestore]
  );

  const handleDetectLocation = useCallback(async () => {
    setLocationDetectStatus('detecting');
    setLocationDetectError(null);
    try {
      const detected = await detectBrowserLocation();
      const detectedLocation: ActiveLocation = {
        id: `geo-${detected.lat.toFixed(3)}-${detected.lon.toFixed(3)}`,
        name: detected.name,
        admin1: detected.admin1 ?? '',
        country: detected.country ?? '',
        areaLabel: detected.areaLabel,
        lat: detected.lat,
        lon: detected.lon,
        timezone: 'auto',
        source: 'browser-geolocation',
      };
      setLocationDetectStatus('success');
      handleSelectLocation(detectedLocation);
    } catch (err) {
      setLocationDetectStatus('error');
      setLocationDetectError(
        err instanceof Error
          ? err.message
          : 'Unable to detect your browser location. Please search for your city manually.'
      );
    }
  }, [handleSelectLocation]);

  const selectedProfile = useMemo(
    () => HOUSEHOLD_PROFILES.find((p) => p.id === selectedProfileId) ?? HOUSEHOLD_PROFILES[0],
    [selectedProfileId]
  );

  const activeDbProfile = useMemo(
    () => dbProfiles.find((p) => p.isActive) ?? null,
    [dbProfiles]
  );

  const effectiveHouseholdLabel = activeDbProfile
    ? `${activeDbProfile.profileName} (${activeDbProfile.demographics})`
    : selectedProfile.label;
  const effectiveHouseholdShort = activeDbProfile
    ? activeDbProfile.profileName
    : selectedProfile.shortLabel;
  const effectiveSafetyTarget = activeDbProfile
    ? activeDbProfile.safeIndoorPm25Target
    : selectedProfile.safeIndoorPm25Target;
  const effectiveClinicalSummary = activeDbProfile
    ? `${activeDbProfile.demographics}. Sensitivity Tier: ${activeDbProfile.sensitivityLevel}. Safe Indoor PM2.5 Target: ≤ ${activeDbProfile.safeIndoorPm25Target} µg/m³.${activeDbProfile.notes ? ` Notes: ${activeDbProfile.notes}` : ''}`
    : selectedProfile.clinicalSummary;

  const saferWindow = useMemo(
    () => computeSaferActivityWindow(airQuality?.hourly ?? []),
    [airQuality]
  );

  const safety = useMemo(
    () =>
      buildDeterministicSafetyBrief({
        usAqi: airQuality?.current.usAqi ?? null,
        europeanAqi: airQuality?.current.europeanAqi ?? null,
        windKmh: weather?.current.windSpeedKmh ?? null,
        precipitationMm: weather?.current.precipitationMm ?? null,
        saferWindowLabel: saferWindow?.windowLabel ?? null,
        safeIndoorPm25Target: effectiveSafetyTarget,
      }),
    [airQuality, weather, saferWindow, effectiveSafetyTarget]
  );

  // Combine built-in routines + enabled PostgreSQL custom routines against live outdoor PM2.5
  const mitigationMetrics = useMemo(() => {
    const activePresets = MITIGATION_ROUTINES.filter((r) => activeRoutineIds.includes(r.id));
    const activeCustom = dbRoutines.filter((r) => r.enabled);
    const combinedRoutines = [
      ...activePresets.map((r) => ({
        title: r.title,
        category: r.category,
        pm25ReductionUg: r.pm25ReductionUg,
      })),
      ...activeCustom.map((r) => ({
        title: r.title,
        category: r.category,
        pm25ReductionUg: r.pm25ReductionUg,
      })),
    ];

    const outdoorPm25 = airQuality?.current.pm25 ?? null;
    if (outdoorPm25 === null) {
      return {
        activeRoutines: combinedRoutines,
        activeTitles: combinedRoutines.map((r) => r.title),
        estimatedIndoorPm25: null,
        reductionRatio: 0,
        totalReductionPct: 0,
      };
    }

    const rawReduction = combinedRoutines.reduce((sum, r) => sum + r.pm25ReductionUg, 0);
    const maxAchievable = Math.max(0, outdoorPm25 - 5);
    const effectiveReduction = Math.min(rawReduction, maxAchievable);
    const estimatedIndoorPm25 = Math.max(5, Math.round(outdoorPm25 - effectiveReduction));
    const reductionRatio =
      outdoorPm25 > 0 ? Math.min(0.88, effectiveReduction / outdoorPm25) : 0;
    const totalReductionPct =
      outdoorPm25 > 0 ? Math.round((effectiveReduction / outdoorPm25) * 100) : 0;

    return {
      activeRoutines: combinedRoutines,
      activeTitles: combinedRoutines.map((r) => r.title),
      estimatedIndoorPm25,
      reductionRatio,
      totalReductionPct,
    };
  }, [activeRoutineIds, dbRoutines, airQuality?.current.pm25]);

  // High-frequency refs passed to Three.js scene (zero React re-renders)
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);
  const aqiRef = useRef<number>(airQuality?.current.usAqi ?? 120);
  const aiStreamingRef = useRef<boolean>(false);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    aqiRef.current = airQuality?.current.usAqi ?? 120;
  }, [airQuality?.current.usAqi]);

  useEffect(() => {
    aiStreamingRef.current = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = -((e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1);
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
        },
      });

      if (!reduced) {
        gsap.from('.hero-stagger', {
          y: 26,
          opacity: 0,
          duration: 1.0,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        });

        gsap.utils.toArray<HTMLElement>('.chapter-reveal').forEach((el) => {
          gsap.from(el, {
            y: 28,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: el,
              start: 'top 86%',
              once: true,
            },
          });
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleToggleRoutine = (routineId: string) => {
    setActiveRoutineIds((prev) =>
      prev.includes(routineId) ? prev.filter((id) => id !== routineId) : [...prev, routineId]
    );
  };

  const handleSendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming) return;

    setChatError(null);
    const now = formatTimeNow();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: now,
    };
    const modelMsgId = `model-${Date.now() + 1}`;
    const placeholderModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: now,
    };

    const historyForRequest = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg, placeholderModelMsg]);
    setIsStreaming(true);

    let collectedText = '';

    const forecastSummaryParts: string[] = [];
    if (saferWindow?.windowLabel) {
      forecastSummaryParts.push(`Relatively lower daytime window: ${saferWindow.windowLabel}`);
    }
    if (weather?.daily && weather.daily.length > 0) {
      const today = weather.daily[0];
      forecastSummaryParts.push(
        `Today High/Low ${today.tempMaxC ?? '—'}/${today.tempMinC ?? '—'}°C, max wind ${today.maxWindSpeedKmh ?? '—'} km/h, max precip prob ${today.maxPrecipProbPct ?? '—'}%`
      );
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForRequest,
          context: {
            cityName: location.areaLabel ? `${location.areaLabel}, ${location.name}` : location.name,
            admin1: location.admin1,
            country: location.country || 'Local Coordinates',
            lat: location.lat,
            lon: location.lon,
            timezone: weather?.timezone || location.timezone || 'auto',
            usAqi: airQuality?.current.usAqi ?? null,
            europeanAqi: airQuality?.current.europeanAqi ?? null,
            pm25: airQuality?.current.pm25 ?? null,
            pm10: airQuality?.current.pm10 ?? null,
            no2: airQuality?.current.no2 ?? null,
            o3: airQuality?.current.o3 ?? null,
            so2: airQuality?.current.so2 ?? null,
            co: airQuality?.current.co ?? null,
            tempC: weather?.current.temperatureC ?? null,
            apparentTempC: weather?.current.apparentTemperatureC ?? null,
            precipitationMm: weather?.current.precipitationMm ?? null,
            cloudCoverPct: weather?.current.cloudCoverPct ?? null,
            weatherCondition: weather?.current.conditionLabel ?? 'Unavailable',
            windKmh: weather?.current.windSpeedKmh ?? null,
            windDir: weather?.current.windCardinal ?? '—',
            humidityPct: weather?.current.relativeHumidityPct ?? null,
            weatherTimestamp: weather?.fetchedAt ?? null,
            airQualityTimestamp: airQuality?.fetchedAt ?? null,
            saferWindowLabel: saferWindow?.windowLabel ?? null,
            forecastSummary: forecastSummaryParts.join('; '),
            householdLabel: effectiveHouseholdLabel,
            householdSummary: effectiveClinicalSummary,
            sensitivityLevel: activeDbProfile?.sensitivityLevel ?? selectedProfile.id,
            safeIndoorPm25Target: effectiveSafetyTarget,
            activeRoutines: mitigationMetrics.activeTitles,
            estimatedIndoorPm25: mitigationMetrics.estimatedIndoorPm25,
            totalReductionPct: mitigationMetrics.totalReductionPct,
          },
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error('No response stream returned from advisor server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6)) as {
            text?: string;
            done?: boolean;
            error?: string;
          };

          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.text) {
            collectedText += payload.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === modelMsgId ? { ...m, text: m.text + payload.text } : m
              )
            );
          }
        }
      }

      // Persist query history to PostgreSQL when signed in
      if (user) {
        void recordDbQuery({
          cityId: location.id.slice(0, 64),
          cityName: location.name,
          aqi: Math.round(airQuality?.current.usAqi ?? 0),
          pm25: Math.round(airQuality?.current.pm25 ?? 0),
          windKmh: Math.round(weather?.current.windSpeedKmh ?? 0),
          queryText: trimmed,
          aiSummary: collectedText.replace(/\s+/g, ' ').slice(0, 220),
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to reach AI advisory service.';
      setChatError(msg);
      setMessages((prev) => prev.filter((m) => !(m.id === modelMsgId && !m.text)));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleExportPlan = () => {
    const usAqi = airQuality?.current.usAqi ?? null;
    const euAqi = airQuality?.current.europeanAqi ?? null;
    const playVerdict = selectedProfile.outdoorPlayAllowed(usAqi);
    const fmt = (v: number | null | undefined, u: string) =>
      v !== null && v !== undefined && Number.isFinite(v) ? `${v} ${u}` : 'Data unavailable';

    const lines = [
      `# Urban Air Quality Assistant — Daily Atmospheric & Family Action Plan`,
      `Data Source: Zero-cost Open-Meteo Forecast & Atmospheric Model Estimates (NOT physical ground sensors)`,
      `Location: ${location.areaLabel ? `${location.areaLabel}, ` : ''}${location.name}${location.admin1 ? `, ${location.admin1}` : ''}${location.country ? `, ${location.country}` : ''} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`,
      `Weather Timestamp: ${weather?.fetchedAt ?? 'Unavailable'} | Air Quality Timestamp: ${airQuality?.fetchedAt ?? 'Unavailable'}`,
      `Air Quality Indices: US EPA AQI = ${usAqi ?? 'Data unavailable'} (${safety.usAqiBand}) | European AQI (EAQI) = ${euAqi ?? 'Data unavailable'} (${safety.europeanAqiBand})`,
      `Pollutants: PM2.5 ${fmt(airQuality?.current.pm25, 'µg/m³')} · PM10 ${fmt(airQuality?.current.pm10, 'µg/m³')} · NO2 ${fmt(airQuality?.current.no2, 'µg/m³')} · O3 ${fmt(airQuality?.current.o3, 'µg/m³')} · SO2 ${fmt(airQuality?.current.so2, 'µg/m³')} · CO ${fmt(airQuality?.current.co, 'µg/m³')}`,
      `Weather: ${weather?.current.conditionLabel ?? 'Unavailable'} · Temp ${fmt(weather?.current.temperatureC, '°C')} (Feels ${fmt(weather?.current.apparentTemperatureC, '°C')}) · Wind ${fmt(weather?.current.windSpeedKmh, 'km/h')} ${weather?.current.windCardinal ?? ''} · Humidity ${fmt(weather?.current.relativeHumidityPct, '%')} · Precip ${fmt(weather?.current.precipitationMm, 'mm')}`,
      `Relatively Lower Forecast Window: ${saferWindow?.windowLabel ?? 'Unavailable (model forecast pending)'}`,
      ``,
      `## Deterministic Public-Health Safety Rules`,
      `- Household Profile: ${effectiveHouseholdLabel}`,
      `- Outdoor Verdict: ${playVerdict.status} — ${playVerdict.note}`,
      `- Outdoor Activity Rule: ${safety.outdoorActivityRule}`,
      `- Sensitive Group Rule: ${safety.sensitiveGroupRule}`,
      `- Ventilation Rule: ${safety.ventilationRule}`,
      `- Mask Guidance: ${safety.maskGuidance}`,
      `- Safe Indoor PM2.5 Target: ≤ ${effectiveSafetyTarget} µg/m³`,
      ``,
      `## Modeled Indoor Mitigation Routines`,
      `- Estimated Indoor PM2.5: ${mitigationMetrics.estimatedIndoorPm25 !== null ? `${mitigationMetrics.estimatedIndoorPm25} µg/m³ (${mitigationMetrics.totalReductionPct}% modeled reduction)` : 'Data unavailable (outdoor PM2.5 estimate missing)'}`,
      ...mitigationMetrics.activeTitles.map((t) => `- [x] ${t}`),
      ``,
      ...(messages.length > 0
        ? [
            `## AEROVA Advisory Transcript`,
            ...messages.map(
              (m) =>
                `### ${m.role === 'user' ? 'Question' : 'AEROVA Advisor'} (${m.timestamp})\n${m.text}\n`
            ),
          ]
        : []),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urban-air-plan-${location.id.replace(/[^a-zA-Z0-9_-]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const cityDisplayLabel = `${location.areaLabel ? `${location.areaLabel}, ` : ''}${location.name}${
    location.country ? `, ${location.country}` : ''
  }`;

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative bg-slate-950 text-slate-100 overflow-x-clip"
    >
      {/* Fixed 3D Atmospheric Canvas (Three.js + R3F) */}
      <AtmosphereScene
        scrollProgressRef={scrollProgressRef}
        aqiRef={aqiRef}
        aiStreamingRef={aiStreamingRef}
        pointerRef={pointerRef}
      />

      {/* Subtle Procedural Film Grain Overlay */}
      <div aria-hidden="true" className="film-grain fixed inset-0 z-10 pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-20 flex flex-col min-h-screen">
        <Navbar
          location={location}
          usAqi={airQuality?.current.usAqi ?? null}
          usAqiBand={safety.usAqiBand}
          severity={safety.severity}
          aqStatus={aqStatus}
          onExportPlan={handleExportPlan}
        />

        <main className="flex-1">
          <HeroSection
            location={location}
            weather={weather}
            weatherStatus={weatherStatus}
            airQuality={airQuality}
            aqStatus={aqStatus}
            saferWindowLabel={saferWindow?.windowLabel ?? null}
          />

          <InvisibleSection
            location={location}
            weather={weather}
            airQuality={airQuality}
          />

          <UnderstandAirSection
            location={location}
            presets={LOCATION_PRESETS}
            recentLocations={recentLocations}
            onSelectLocation={handleSelectLocation}
            onDetectLocation={() => void handleDetectLocation()}
            locationDetectStatus={locationDetectStatus}
            locationDetectError={locationDetectError}
            weather={weather}
            weatherStatus={weatherStatus}
            weatherError={weatherError}
            onRetryWeather={() => void fetchForLocation(location, { forceRefresh: true, mode: 'weather' })}
            airQuality={airQuality}
            aqStatus={aqStatus}
            aqError={aqError}
            onRetryAirQuality={() => void fetchForLocation(location, { forceRefresh: true, mode: 'aq' })}
            onRefreshAll={() => void fetchForLocation(location, { forceRefresh: true, mode: 'both' })}
            safety={safety}
            profiles={HOUSEHOLD_PROFILES}
            selectedProfile={selectedProfile}
            onSelectProfile={setSelectedProfileId}
            activeDbProfileName={activeDbProfile?.profileName ?? null}
            activeSafetyTarget={effectiveSafetyTarget}
            estimatedIndoorPm25={mitigationMetrics.estimatedIndoorPm25}
          />

          <RetroCrtCarousel
            location={location}
            weather={weather}
            weatherStatus={weatherStatus}
            airQuality={airQuality}
            aqStatus={aqStatus}
            saferWindowLabel={saferWindow?.windowLabel ?? null}
            saferWindowHours={
              saferWindow ? [saferWindow.startHour, saferWindow.endHour] : null
            }
            householdShortLabel={effectiveHouseholdShort}
            activeSafetyTarget={effectiveSafetyTarget}
            reductionRatio={mitigationMetrics.reductionRatio}
            estimatedIndoorPm25={mitigationMetrics.estimatedIndoorPm25}
            activeRoutines={mitigationMetrics.activeRoutines}
          />

          <AtmosphericMapSection location={location} />

          <HouseholdDbPanel onSelectQueryPrompt={(q) => void handleSendMessage(q)} />

          <AiAssistantChat
            messages={messages}
            quickActions={QUICK_ACTION_PROMPTS}
            isStreaming={isStreaming}
            errorMessage={chatError}
            cityLabel={cityDisplayLabel}
            householdLabel={effectiveHouseholdShort}
            aqi={airQuality?.current.usAqi ?? null}
            aqiCategory={safety.usAqiBand}
            onSendMessage={(p) => void handleSendMessage(p)}
            onResetChat={() => {
              setMessages([]);
              setChatError(null);
            }}
          />

          <DailyRhythmSection
            location={location}
            usAqi={airQuality?.current.usAqi ?? null}
            outdoorPm25={airQuality?.current.pm25 ?? null}
            saferWindowLabel={saferWindow?.windowLabel ?? null}
            profile={selectedProfile}
            activeSafetyTarget={effectiveSafetyTarget}
            householdShortLabel={effectiveHouseholdShort}
            routines={MITIGATION_ROUTINES}
            activeRoutineIds={activeRoutineIds}
            onToggleRoutine={handleToggleRoutine}
            estimatedIndoorPm25={mitigationMetrics.estimatedIndoorPm25}
            totalReductionPct={mitigationMetrics.totalReductionPct}
          />

          <CollectiveBreathSection
            location={location}
            householdReductionPct={mitigationMetrics.totalReductionPct}
            onExportPlan={handleExportPlan}
          />
        </main>

        <footer className="border-t border-slate-800 bg-slate-950/95">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium tracking-[0.14em] text-amber-300"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                AEROVA
              </span>
              <span aria-hidden="true" className="text-slate-700">
                ·
              </span>
              <span>
                Urban Air Quality Assistant ·{' '}
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                  Open-Meteo
                </a>{' '}
                / CAMS Telemetry · Locality labels ©{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                  OpenStreetMap contributors
                </a>
              </span>
            </div>
            <p>
              Model-estimated atmospheric guidance only; consult a physician promptly for
              wheezing, chest pain, or acute respiratory distress.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}
