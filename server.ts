import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  activateHouseholdProfile,
  addCustomRoutine,
  createHouseholdProfile,
  deleteCustomRoutine,
  deleteHouseholdProfile,
  getOrCreateUser,
  getUserWorkspace,
  recordSearchQuery,
  toggleCustomRoutine,
} from './src/db/repository.ts';
import { buildDeterministicSafetyBrief } from './src/services/safetyRules.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const NOMINATIM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const nominatimCache = new Map<string, { expiresAt: number; data: ReverseGeocodeData }>();
let nextNominatimRequestAt = 0;

interface ReverseGeocodeData {
  city: string;
  area: string;
  admin1: string;
  country: string;
}

interface ChatMessageInput {
  role: 'user' | 'model';
  text: string;
}

interface AirQualityContextInput {
  cityName: string;
  admin1?: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
  tempC: number | null;
  apparentTempC: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
  weatherCondition: string;
  windKmh: number | null;
  windDir: string;
  humidityPct: number | null;
  weatherTimestamp: string | null;
  airQualityTimestamp: string | null;
  saferWindowLabel: string | null;
  forecastSummary?: string;
  householdLabel: string;
  householdSummary: string;
  sensitivityLevel?: string;
  safeIndoorPm25Target?: number;
  activeRoutines: string[];
  estimatedIndoorPm25: number | null;
  totalReductionPct: number;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function fmtVal(val: number | null | undefined, unit: string): string {
  return val !== null && val !== undefined && Number.isFinite(val)
    ? `${val} ${unit}`
    : 'Data unavailable';
}

function buildSystemInstruction(ctx: AirQualityContextInput): string {
  const routinesText =
    ctx.activeRoutines.length > 0 ? ctx.activeRoutines.join(', ') : 'None enabled yet';
  const safeTarget = ctx.safeIndoorPm25Target ?? 25;

  const deterministic = buildDeterministicSafetyBrief({
    usAqi: ctx.usAqi,
    europeanAqi: ctx.europeanAqi,
    windKmh: ctx.windKmh,
    precipitationMm: ctx.precipitationMm,
    saferWindowLabel: ctx.saferWindowLabel,
    safeIndoorPm25Target: safeTarget,
  });

  return [
    'You are AEROVA, the Urban Air Quality Assistant advisor. Help families and communities navigate urban air pollution and weather conditions with grounded, non-alarmist, evidence-based guidance.',
    '',
    '[VERIFIED OPEN-METEO CONTEXT]',
    `- Location: ${ctx.cityName}${ctx.admin1 ? `, ${ctx.admin1}` : ''}, ${ctx.country} (Coordinates: ${ctx.lat.toFixed(3)}, ${ctx.lon.toFixed(3)}; Timezone: ${ctx.timezone || 'auto'})`,
    `- Data Source Disclosure: Open-Meteo atmospheric model estimates (CAMS regional assimilation) & Open-Meteo Forecast API — NOT ground-station hardware sensors.`,
    `- Weather Timestamp: ${ctx.weatherTimestamp || 'Unavailable'} | Air Quality Timestamp: ${ctx.airQualityTimestamp || 'Unavailable'}`,
    `- Air Quality Estimates: US EPA AQI = ${ctx.usAqi ?? 'Data unavailable'} (${deterministic.usAqiBand}) | European AQI (EAQI) = ${ctx.europeanAqi ?? 'Data unavailable'} (${deterministic.europeanAqiBand})`,
    `- Pollutants (µg/m³): PM2.5 = ${fmtVal(ctx.pm25, 'µg/m³')}, PM10 = ${fmtVal(ctx.pm10, 'µg/m³')}, NO2 = ${fmtVal(ctx.no2, 'µg/m³')}, O3 = ${fmtVal(ctx.o3, 'µg/m³')}, SO2 = ${fmtVal(ctx.so2, 'µg/m³')}, CO = ${fmtVal(ctx.co, 'µg/m³')}`,
    `- Current Weather: ${ctx.weatherCondition}, Temp ${fmtVal(ctx.tempC, '°C')} (Feels like ${fmtVal(ctx.apparentTempC, '°C')}), Humidity ${fmtVal(ctx.humidityPct, '%')}, Wind ${fmtVal(ctx.windKmh, 'km/h')} ${ctx.windDir}, Precipitation ${fmtVal(ctx.precipitationMm, 'mm')}, Cloud Cover ${fmtVal(ctx.cloudCoverPct, '%')}`,
    ...(ctx.forecastSummary ? [`- Short-Term Forecast Trajectory: ${ctx.forecastSummary}`] : []),
    '',
    '[DETERMINISTIC PUBLIC-HEALTH SAFETY RULES — MUST NOT OVERRIDE]',
    `- Outdoor Activity Rule: ${deterministic.outdoorActivityRule}`,
    `- Sensitive Group Rule: ${deterministic.sensitiveGroupRule}`,
    `- Ventilation Rule: ${deterministic.ventilationRule}`,
    `- Mask Guidance: ${deterministic.maskGuidance}`,
    `- Household Profile: ${ctx.householdLabel} (Sensitivity Tier: ${ctx.sensitivityLevel ?? 'standard'}; Target Indoor PM2.5 ≤ ${safeTarget} µg/m³)`,
    `- Household Clinical Context: ${ctx.householdSummary}`,
    `- Active Indoor Mitigation Routines: ${routinesText} (Modeled Indoor PM2.5 Estimate: ${ctx.estimatedIndoorPm25 !== null ? `${ctx.estimatedIndoorPm25} µg/m³` : 'Data unavailable'}, ${ctx.totalReductionPct}% modeled cut)`,
    '',
    'STRICT ADVISORY SAFETY & TRANSPARENCY MANDATES:',
    '1. NEVER invent health thresholds or contradict the Deterministic Public-Health Safety Rules above.',
    '2. NEVER confuse US EPA AQI (0–500) with European AQI (EAQI) or India CPCB AQI; always cite the standard name when quoting an index.',
    '3. NEVER present Open-Meteo model estimates as physical ground-station measurements, and NEVER fabricate values marked "Data unavailable".',
    '4. NEVER claim weather conditions (wind, rain, temperature) alone determine AQI, and NEVER promise any time window is "pollution-free" — frame lower forecast periods only as relatively lower-concentration windows.',
    '5. Include the Weather & Air Quality timestamps briefly when summarizing current conditions.',
    '6. Balance accessible low-cost home safeguards (wet mopping, sealing door gaps, Corsi-Rosenthal MERV-13 box fan, covered induction cooking) with HEPA/respirator guidance, and advise consulting a clinician promptly for respiratory symptoms without diagnosing.',
    '',
    '[OUTPUT FORMAT]',
    'Provide a concise, empathetic Markdown advisory (~200–320 words) with:',
    '- **Current Air & Weather Summary (Model Estimates + Timestamps)**',
    '- **Deterministic Safety & Activity Guidance for Your Household**',
    '- **Practical Ventilation, Filtration & Commute Actions**',
  ].join('\n');
}

function isTransientGeminiError(error: unknown): boolean {
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return raw.includes('503') || raw.includes('unavailable') || raw.includes('high demand');
}

function mapGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message: 'Gemini API key is missing or unauthorized. Check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return {
      status: 429,
      message: 'Rate limit or quota reached for the Gemini API key. Please retry shortly.',
    };
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return {
      status: 503,
      message: 'The advisory model is experiencing temporary high demand. Please retry in a few seconds.',
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: 'Requested Gemini model could not be found. Verify model configuration.',
    };
  }

  return {
    status: 500,
    message: 'Unable to generate air quality advisory right now. Please retry shortly.',
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Zero-cost reverse locality resolution via OpenStreetMap Nominatim (best-effort; never required)
  app.get('/api/reverse-geocode', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Valid lat and lon are required.' });
      return;
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = nominatimCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.data);
      return;
    }

    const now = Date.now();
    const waitMs = Math.max(0, nextNominatimRequestAt - now);
    // This optional label must not delay a newer location request or flood the public Nominatim service.
    if (waitMs > 2500) {
      res.status(429).json({ error: 'Locality lookup is busy; coordinate telemetry is still available.' });
      return;
    }
    nextNominatimRequestAt = Math.max(now, nextNominatimRequestAt) + NOMINATIM_MIN_INTERVAL_MS;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      timer = setTimeout(() => controller.abort(), 3500);
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&zoom=13&addressdetails=1`;
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'UrbanAirQualityAssistant/1.0 (non-commercial environmental health app)',
          'Accept-Language': 'en',
        },
      });
      if (!resp.ok) {
        res.status(503).json({ error: 'Locality lookup is temporarily unavailable.' });
        return;
      }
      const data = (await resp.json()) as {
        address?: {
          suburb?: string;
          neighbourhood?: string;
          city_district?: string;
          city?: string;
          town?: string;
          village?: string;
          county?: string;
          state?: string;
          country?: string;
        };
      };
      const addr = data.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const area = addr.neighbourhood || addr.suburb || addr.city_district || '';
      const result: ReverseGeocodeData = {
        city,
        area,
        admin1: addr.state || '',
        country: addr.country || '',
      };
      nominatimCache.set(cacheKey, {
        expiresAt: Date.now() + NOMINATIM_CACHE_TTL_MS,
        data: result,
      });
      if (nominatimCache.size > 1000) {
        const oldestKey = nominatimCache.keys().next().value;
        if (oldestKey) nominatimCache.delete(oldestKey);
      }
      res.json(result);
    } catch (error) {
      res.status(503).json({
        error: error instanceof Error && error.name === 'AbortError'
          ? 'Locality lookup timed out.'
          : 'Locality lookup failed.',
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  });

  // Zero-cost multi-coordinate Open-Meteo spatial basin dispersion grid (no Google Maps, no API keys)
  app.get('/api/basin-grid', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      res.status(400).json({ error: 'Valid lat and lon query parameters are required.' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);

    try {
      const sectors = [
        { id: 'sector-center', label: 'Center Coordinates', bearing: 'CORE', dLat: 0, dLon: 0 },
        { id: 'sector-nw', label: 'Northwest Corridor (~5 km)', bearing: 'NW', dLat: 0.036, dLon: -0.036 },
        { id: 'sector-ne', label: 'Northeast Corridor (~5 km)', bearing: 'NE', dLat: 0.036, dLon: 0.036 },
        { id: 'sector-se', label: 'Southeast Sector (~5 km)', bearing: 'SE', dLat: -0.036, dLon: 0.036 },
        { id: 'sector-sw', label: 'Southwest Sector (~5 km)', bearing: 'SW', dLat: -0.036, dLon: -0.036 },
      ];

      const latitudes = sectors.map((s) => (lat + s.dLat).toFixed(4)).join(',');
      const longitudes = sectors.map((s) => (lon + s.dLon).toFixed(4)).join(',');

      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitudes}&longitude=${longitudes}&current=us_aqi,european_aqi,pm2_5,nitrogen_dioxide&timezone=auto`;
      const resp = await fetch(url, { signal: controller.signal });

      if (resp.status === 429) {
        res.status(429).json({ error: 'Open-Meteo air-quality rate limit reached. Retry shortly.' });
        return;
      }
      if (!resp.ok) {
        res.status(502).json({ error: `Open-Meteo spatial grid returned HTTP ${resp.status}.` });
        return;
      }

      const raw = (await resp.json()) as
        | Array<{
            current?: {
              time?: string;
              us_aqi?: number | null;
              european_aqi?: number | null;
              pm2_5?: number | null;
              nitrogen_dioxide?: number | null;
            };
          }>
        | {
            current?: {
              time?: string;
              us_aqi?: number | null;
              european_aqi?: number | null;
              pm2_5?: number | null;
              nitrogen_dioxide?: number | null;
            };
          };

      const rows = Array.isArray(raw) ? raw : [raw];
      const nodes = sectors.map((sec, i) => {
        const cur = rows[i]?.current;
        const toNullNum = (v: unknown) =>
          typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
        return {
          id: sec.id,
          label: sec.label,
          bearing: sec.bearing,
          lat: Number((lat + sec.dLat).toFixed(4)),
          lon: Number((lon + sec.dLon).toFixed(4)),
          usAqi: toNullNum(cur?.us_aqi),
          europeanAqi: toNullNum(cur?.european_aqi),
          pm25: toNullNum(cur?.pm2_5),
          no2: toNullNum(cur?.nitrogen_dioxide),
          apiTime: cur?.time ?? null,
        };
      });

      res.json({
        fetchedAt: new Date().toISOString(),
        isModelEstimate: true,
        source: 'Open-Meteo Air Quality Model Grid',
        nodes,
      });
    } catch (error) {
      res.status(503).json({
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'Spatial Open-Meteo grid request timed out.'
            : 'Unable to reach Open-Meteo spatial grid.',
      });
    } finally {
      clearTimeout(timeout);
    }
  });

  // --- Authenticated Cloud SQL (PostgreSQL) Workspace Endpoints ---

  app.get('/api/user/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@firebase.user`;
      const name = typeof req.user!.name === 'string' ? req.user!.name : null;

      await getOrCreateUser(uid, email, name);
      const workspace = await getUserWorkspace(uid);
      res.json(workspace);
    } catch (error) {
      console.error('Failed to load user workspace:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load household workspace.',
      });
    }
  });

  app.post('/api/user/profiles', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user!.name === 'string' ? req.user!.name : null);

      const { profileName, demographics, sensitivityLevel, safeIndoorPm25Target, notes } =
        req.body as {
          profileName?: string;
          demographics?: string;
          sensitivityLevel?: string;
          safeIndoorPm25Target?: number;
          notes?: string;
        };

      if (!profileName?.trim() || !demographics?.trim()) {
        res.status(400).json({ error: 'Profile name and demographics are required.' });
        return;
      }

      const created = await createHouseholdProfile({
        userUid: uid,
        profileName: profileName.trim(),
        demographics: demographics.trim(),
        sensitivityLevel: sensitivityLevel?.trim() || 'pediatric-elderly',
        safeIndoorPm25Target: Number(safeIndoorPm25Target) || 25,
        notes: notes?.trim() || '',
      });

      res.status(201).json(created);
    } catch (error) {
      console.error('Failed to create household profile:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to save household profile.',
      });
    }
  });

  app.patch('/api/user/profiles/:id/activate', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid profile ID.' });
      return;
    }
    try {
      const updated = await activateHouseholdProfile(req.user!.uid, id);
      if (!updated) {
        res.status(404).json({ error: 'Household profile not found.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to activate profile.',
      });
    }
  });

  app.delete('/api/user/profiles/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid profile ID.' });
      return;
    }
    try {
      await deleteHouseholdProfile(req.user!.uid, id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete profile.',
      });
    }
  });

  app.post('/api/user/queries', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user!.name === 'string' ? req.user!.name : null);

      const { cityId, cityName, aqi, pm25, windKmh, queryText, aiSummary } = req.body as {
        cityId?: string;
        cityName?: string;
        aqi?: number;
        pm25?: number;
        windKmh?: number;
        queryText?: string;
        aiSummary?: string;
      };

      if (!cityId || !cityName || !queryText?.trim()) {
        res.status(400).json({ error: 'cityId, cityName, and queryText are required.' });
        return;
      }

      const saved = await recordSearchQuery({
        userUid: uid,
        cityId,
        cityName,
        aqi: Number(aqi) || 0,
        pm25: Number(pm25) || 0,
        windKmh: Number(windKmh) || 0,
        queryText: queryText.trim(),
        aiSummary: aiSummary?.trim() || '',
      });

      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to save query history.',
      });
    }
  });

  app.post('/api/user/routines', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@firebase.user`;
      await getOrCreateUser(uid, email, typeof req.user!.name === 'string' ? req.user!.name : null);

      const { title, category, pm25ReductionUg } = req.body as {
        title?: string;
        category?: string;
        pm25ReductionUg?: number;
      };

      if (!title?.trim()) {
        res.status(400).json({ error: 'Routine title is required.' });
        return;
      }

      const saved = await addCustomRoutine({
        userUid: uid,
        title: title.trim(),
        category: category?.trim() || 'Filtration',
        pm25ReductionUg: Number(pm25ReductionUg) || 15,
      });

      res.status(201).json(saved);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to add custom routine.',
      });
    }
  });

  app.patch('/api/user/routines/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const { enabled } = req.body as { enabled?: boolean };
    if (!Number.isInteger(id) || id <= 0 || typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Valid routine ID and boolean enabled flag are required.' });
      return;
    }
    try {
      const updated = await toggleCustomRoutine(req.user!.uid, id, enabled);
      if (!updated) {
        res.status(404).json({ error: 'Custom routine not found.' });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to toggle custom routine.',
      });
    }
  });

  app.delete('/api/user/routines/:id', requireAuth, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid routine ID.' });
      return;
    }
    try {
      await deleteCustomRoutine(req.user!.uid, id);
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete custom routine.',
      });
    }
  });

  // --- Live Gemini Intelligence Core SSE Endpoint ---

  app.post('/api/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(403).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const { message, history, context } = req.body as {
      message?: string;
      history?: ChatMessageInput[];
      context?: AirQualityContextInput;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'A non-empty message is required.' });
      return;
    }

    if (!context || typeof context.cityName !== 'string') {
      res.status(400).json({ error: 'Environmental and household context is required.' });
      return;
    }

    const contents = [
      ...(Array.isArray(history) ? history : [])
        .filter((m) => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
        .slice(-10)
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
      {
        role: 'user' as const,
        parts: [{ text: `[USER QUERY]\n"${message.trim()}"` }],
      },
    ];

    try {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(': connected\n\n');

      const delaysMs = [600, 1400];
      let stream: Awaited<ReturnType<typeof ai.models.generateContentStream>> | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
        try {
          stream = await ai.models.generateContentStream({
            model: 'gemini-4-hydrogen',
            contents,
            config: {
              systemInstruction: buildSystemInstruction(context),
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          break;
        } catch (err) {
          lastError = err;
          if (attempt < delaysMs.length && isTransientGeminiError(err)) {
            await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
            continue;
          }
          throw err;
        }
      }

      if (!stream) {
        throw lastError ?? new Error('Unable to initialize advisory stream.');
      }

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      const mapped = mapGeminiError(error);
      if (!res.headersSent) {
        res.status(mapped.status).json({ error: mapped.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: mapped.message })}\n\n`);
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Urban Air Quality Assistant server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
