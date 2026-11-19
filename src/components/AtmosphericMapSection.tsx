import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Compass,
  MapPin,
  Radar,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { ActiveLocation } from '../types/environment';
import { useAuth } from '../context/AuthContext';
import { apiUrl, readApiResponse } from '../services/apiClient';

interface BasinSectorNode {
  id: string;
  label: string;
  bearing: string;
  lat: number;
  lon: number;
  usAqi: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  no2: number | null;
  apiTime: string | null;
}

interface AtmosphericMapSectionProps {
  location: ActiveLocation;
}

function isBasinSectorNode(value: unknown): value is BasinSectorNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<BasinSectorNode>;
  const validMeasurement = (measurement: unknown) =>
    measurement === null ||
    (typeof measurement === 'number' && Number.isFinite(measurement) && measurement >= 0);

  return (
    typeof node.id === 'string' &&
    typeof node.label === 'string' &&
    typeof node.bearing === 'string' &&
    typeof node.lat === 'number' && Number.isFinite(node.lat) && node.lat >= -90 && node.lat <= 90 &&
    typeof node.lon === 'number' && Number.isFinite(node.lon) && node.lon >= -180 && node.lon <= 180 &&
    validMeasurement(node.usAqi) &&
    validMeasurement(node.europeanAqi) &&
    validMeasurement(node.pm25) &&
    validMeasurement(node.no2) &&
    (typeof node.apiTime === 'string' || node.apiTime === null)
  );
}

const SECTOR_POSITIONS: Record<string, { x: number; y: number }> = {
  'sector-center': { x: 200, y: 180 },
  'sector-nw': { x: 105, y: 95 },
  'sector-ne': { x: 295, y: 95 },
  'sector-se': { x: 295, y: 265 },
  'sector-sw': { x: 105, y: 265 },
};

function getNodeColor(usAqi: number | null): string {
  if (usAqi === null) return '#94A3B8';
  if (usAqi >= 201) return '#FB7185';
  if (usAqi >= 101) return '#F59E0B';
  return '#34D399';
}

export function AtmosphericMapSection({ location }: AtmosphericMapSectionProps) {
  const {
    user,
    signInWithGoogle,
    observations,
    saveObservationToFirestore,
    deleteObservationFromFirestore,
  } = useAuth();

  const [nodes, setNodes] = useState<BasinSectorNode[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('sector-center');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);

  const fetchBasinGrid = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(
        apiUrl(`/api/basin-grid?lat=${encodeURIComponent(location.lat)}&lon=${encodeURIComponent(location.lon)}`),
        { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } }
      );
      const data = await readApiResponse<{
        nodes?: BasinSectorNode[];
        fetchedAt?: string;
        error?: string;
      }>(resp);
      const expectedBearings = new Set(['CORE', 'NW', 'NE', 'SE', 'SW']);
      if (
        !Array.isArray(data.nodes) ||
        data.nodes.length !== expectedBearings.size ||
        data.nodes.some((node) => !isBasinSectorNode(node)) ||
        new Set(data.nodes.map((node) => node.bearing)).size !== expectedBearings.size ||
        data.nodes.some((node) => !expectedBearings.has(node.bearing))
      ) {
        throw new Error('Spatial grid endpoint returned incomplete or invalid five-sector data.');
      }
      setNodes(data.nodes);
      setFetchedAt(data.fetchedAt ?? null);
      setSelectedNodeId('sector-center');
    } catch (err) {
      if (requestControllerRef.current !== controller) return;
      const message = controller.signal.aborted
        ? 'Spatial grid request timed out. Retry the grid or check the server connection.'
        : err instanceof TypeError
          ? 'Could not connect to the basin grid API. Check the API host and server availability.'
          : err instanceof Error
            ? err.message
            : 'Unable to load spatial dispersion estimates.';
      setErrorMsg(message);
      setNodes([]);
    } finally {
      window.clearTimeout(timeout);
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [location.lat, location.lon]);

  useEffect(() => {
    void fetchBasinGrid();
    return () => {
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [fetchBasinGrid]);

  const activeNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0] ?? null;

  const handleSavePin = async (node: BasinSectorNode) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setSavingId(node.id);
    setSaveFeedback(null);
    try {
      await saveObservationToFirestore({
        placeName: `${location.name} · ${node.label}`,
        kind: node.bearing === 'CORE' ? 'neighborhood' : 'sensor_station',
        cityName: location.name,
        aqi: node.usAqi ?? 0,
        pm25: node.pm25 ?? 0,
        notes: `Open-Meteo model grid (${node.lat.toFixed(3)}, ${node.lon.toFixed(3)}) · EAQI ${
          node.europeanAqi ?? 'N/A'
        }`,
      });
      setSaveFeedback(`Saved "${node.label}" to your Firestore refuge bookmarks.`);
    } catch (err) {
      setSaveFeedback(err instanceof Error ? err.message : 'Unable to save observation.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section
      id="section-maps"
      aria-label="Zero-Cost Spatial Basin Radar & Sector Grid"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 chapter-reveal">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-emerald-300 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zero-Cost Spatial Basin Radar · Open-Meteo Multi-Point Grid</span>
          </p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
            Inspect directional air quality across surrounding sectors.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Plots 5 Open-Meteo model grid coordinates around{' '}
            <strong className="text-slate-100">{location.name}</strong> ({location.lat.toFixed(3)},{' '}
            {location.lon.toFixed(3)}) to compare directional particulate gradients and bookmark
            sector notes to your account.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchBasinGrid()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-amber-400/35 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-amber-300 transition-colors cursor-pointer disabled:opacity-60 self-start lg:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{loading ? 'Scanning Sectors…' : 'Refresh Spatial Grid'}</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-200"
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void fetchBasinGrid()}
            className="px-3 py-1 rounded-lg bg-rose-400 text-slate-950 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {saveFeedback && (
        <p className="text-xs font-mono text-emerald-300" role="status">
          {saveFeedback}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start chapter-reveal">
        {/* Interactive Retro-Futuristic SVG Coordinate Radar */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Radar className="w-4 h-4" aria-hidden="true" />
              <span>5 km Directional Grid · Model Estimates</span>
            </span>
            <span>
              {fetchedAt
                ? `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Awaiting telemetry'}
            </span>
          </div>

          <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden crt-vignette p-3">
            <svg
              viewBox="0 0 400 360"
              role="img"
              aria-label={`5-point atmospheric dispersion radar around ${location.name}`}
              className="w-full h-[340px]"
            >
              {/* Concentric Range Rings */}
              <circle cx="200" cy="180" r="62" fill="none" stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
              <circle cx="200" cy="180" r="126" fill="none" stroke="rgba(148,163,184,0.18)" strokeDasharray="4 4" />
              <circle cx="200" cy="180" r="165" fill="none" stroke="rgba(245,158,11,0.12)" />

              {/* Crosshairs */}
              <line x1="200" y1="12" x2="200" y2="348" stroke="rgba(148,163,184,0.15)" />
              <line x1="16" y1="180" x2="384" y2="180" stroke="rgba(148,163,184,0.15)" />

              {/* Cardinal Labels */}
              <text x="200" y="24" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="IBM Plex Mono">
                N
              </text>
              <text x="200" y="352" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="IBM Plex Mono">
                S
              </text>
              <text x="380" y="176" textAnchor="end" fill="#64748B" fontSize="10" fontFamily="IBM Plex Mono">
                E
              </text>
              <text x="20" y="176" textAnchor="start" fill="#64748B" fontSize="10" fontFamily="IBM Plex Mono">
                W
              </text>

              {/* Connecting Vector Lines */}
              {nodes
                .filter((n) => n.id !== 'sector-center')
                .map((n) => {
                  const pos = SECTOR_POSITIONS[n.id] ?? { x: 200, y: 180 };
                  return (
                    <line
                      key={`line-${n.id}`}
                      x1="200"
                      y1="180"
                      x2={pos.x}
                      y2={pos.y}
                      stroke="rgba(245,158,11,0.22)"
                      strokeDasharray="3 3"
                    />
                  );
                })}

              {/* Sector Nodes */}
              {nodes.map((node) => {
                const pos = SECTOR_POSITIONS[node.id] ?? { x: 200, y: 180 };
                const active = node.id === activeNode?.id;
                const fill = getNodeColor(node.usAqi);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    {active && (
                      <circle r="28" fill="none" stroke={fill} strokeWidth="1.5" strokeOpacity="0.65" />
                    )}
                    <circle r="19" fill="#0F172A" stroke={fill} strokeWidth={active ? 2.5 : 1.5} />
                    <text
                      y="-1"
                      textAnchor="middle"
                      fill={fill}
                      fontSize="11"
                      fontWeight="600"
                      fontFamily="IBM Plex Mono"
                    >
                      {node.usAqi !== null ? Math.round(node.usAqi) : 'N/A'}
                    </text>
                    <text y="10" textAnchor="middle" fill="#CBD5E1" fontSize="7.5" fontFamily="IBM Plex Mono">
                      {node.bearing}
                    </text>
                    <text y="33" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="IBM Plex Mono">
                      {node.pm25 !== null ? `${node.pm25} µg` : 'Unavailable'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                US AQI ≤ 100
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                US AQI 101–200
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                US AQI 201+
              </span>
            </div>
            <span>Model-based spatial grid</span>
          </div>
        </div>

        {/* Right Column: Selected Sector Inspector + Firestore Saved Pins */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 space-y-4">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-amber-300">
              Selected Sector Readout
            </p>

            {activeNode ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{activeNode.label}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      {activeNode.lat.toFixed(4)}, {activeNode.lon.toFixed(4)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingId === activeNode.id}
                    onClick={() => void handleSavePin(activeNode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{user ? 'Bookmark Sector' : 'Sign In to Save'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-mono text-slate-400 uppercase">US EPA AQI</p>
                    <p className="text-lg font-mono text-amber-300 mt-0.5">
                      {activeNode.usAqi ?? 'Data unavailable'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-mono text-slate-400 uppercase">European AQI</p>
                    <p className="text-lg font-mono text-slate-100 mt-0.5">
                      {activeNode.europeanAqi ?? 'Data unavailable'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-mono text-slate-400 uppercase">PM2.5</p>
                    <p className="text-sm font-mono text-rose-300 mt-0.5">
                      {activeNode.pm25 !== null ? `${activeNode.pm25} µg/m³` : 'Data unavailable'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] font-mono text-slate-400 uppercase">NO2</p>
                    <p className="text-sm font-mono text-emerald-300 mt-0.5">
                      {activeNode.no2 !== null ? `${activeNode.no2} µg/m³` : 'Data unavailable'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {loading ? 'Querying directional sectors…' : 'Sector coordinates unavailable.'}
              </p>
            )}
          </div>

          {/* Saved Firestore Observations */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.16em] text-emerald-300">
                <MapPin className="w-4 h-4" aria-hidden="true" />
                <span>Saved Location Bookmarks</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {observations.length} saved
              </span>
            </div>

            {!user ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in with Google to bookmark neighborhood coordinates and sector air readings
                  across sessions.
                </p>
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Sign In with Google
                </button>
              </div>
            ) : observations.length === 0 ? (
              <p className="text-xs text-slate-400">
                No locations bookmarked yet. Select any sector node and click Bookmark Sector.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {observations.map((obs) => (
                  <li
                    key={obs.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100 truncate">{obs.placeName}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {obs.cityName} · US AQI {obs.aqi} · PM2.5 {obs.pm25} µg/m³
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteObservationFromFirestore(obs.id)}
                      aria-label={`Remove ${obs.placeName}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
