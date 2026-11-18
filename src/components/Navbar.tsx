import { Download, LogIn, Menu, Shield, Wind, X } from 'lucide-react';
import { useState } from 'react';
import type { ActiveLocation, AsyncFetchStatus } from '../types/environment';
import type { HealthSeverity } from '../services/safetyRules';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  location: ActiveLocation;
  usAqi: number | null;
  usAqiBand: string;
  severity: HealthSeverity;
  aqStatus: AsyncFetchStatus;
  onExportPlan: () => void;
}

const NAV_CHAPTERS = [
  { href: '#section-1', label: 'The Invisible' },
  { href: '#section-2', label: 'Live Telemetry' },
  { href: '#crt-carousel', label: 'CRT Forecasts' },
  { href: '#section-maps', label: 'Basin Radar' },
  { href: '#section-vault', label: 'Household Vault' },
  { href: '#section-3', label: 'Advisor' },
  { href: '#section-4', label: 'Daily Rhythm' },
];

export function Navbar({
  location,
  usAqi,
  severity,
  aqStatus,
  onExportPlan,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signInWithGoogle, authBusy } = useAuth();

  const badgeTone =
    usAqi === null
      ? 'text-slate-300 border-slate-700 bg-slate-900'
      : severity === 'severe' || severity === 'very-poor'
        ? 'text-rose-200 border-rose-400/45 bg-rose-500/15 shadow-[0_0_20px_rgba(251,113,133,0.22)]'
        : severity === 'poor' || severity === 'sensitive'
          ? 'text-amber-200 border-amber-400/45 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          : 'text-emerald-200 border-emerald-400/40 bg-emerald-500/12';

  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-slate-800/90 bg-slate-950/92">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <a
            href="#hero"
            className="inline-flex items-center gap-2.5 text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md px-1 py-1"
          >
            <span className="w-7 h-7 rounded-lg border border-amber-400/45 bg-slate-900 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(245,158,11,0.22)]">
              <Wind className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            </span>
            <span
              className="text-base sm:text-lg font-medium tracking-[0.14em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              AEROVA
            </span>
          </a>

          <div
            className={`hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-mono tabular-nums ${badgeTone}`}
            title={`${location.name}: US AQI ${usAqi ?? 'Unavailable'} (Open-Meteo model estimate)`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full bg-current ${aqStatus === 'loading' ? 'animate-ping' : 'animate-pulse'}`}
              aria-hidden="true"
            />
            <span className="max-w-[120px] truncate">{location.name}</span>
            <span className="opacity-50">/</span>
            <span>
              {aqStatus === 'loading' && usAqi === null
                ? 'Syncing…'
                : usAqi !== null
                  ? `US AQI ${Math.round(usAqi)}`
                  : 'AQI Unavailable'}
            </span>
          </div>
        </div>

        <nav aria-label="Dashboard sections" className="hidden lg:flex items-center gap-4">
          {NAV_CHAPTERS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-medium tracking-wide text-slate-400 hover:text-amber-300 transition-colors py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <a
              href="#section-vault"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl border border-emerald-400/30 bg-slate-900 text-xs font-mono text-emerald-300 hover:border-emerald-400/60"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="max-w-[110px] truncate">{user.displayName?.split(' ')[0] || 'Synced'}</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={authBusy}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl border border-amber-400/35 bg-slate-900 hover:bg-slate-800 text-xs font-mono text-amber-300 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportPlan}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-amber-400/45 text-xs font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Export Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 cursor-pointer"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile chapters"
          className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1"
        >
          {NAV_CHAPTERS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-amber-300 hover:bg-slate-900"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
