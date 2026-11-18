import { useState } from 'react';
import {
  Check,
  History,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  Sliders,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth, type DbHouseholdProfile } from '../context/AuthContext';

interface HouseholdDbPanelProps {
  onSelectQueryPrompt: (prompt: string) => void;
}

const SENSITIVITY_OPTIONS = [
  { value: 'pediatric-elderly', label: 'Pediatric & Elderly (High Caution)' },
  { value: 'respiratory-care', label: 'Asthma / Chronic Bronchitis Care' },
  { value: 'school-commute', label: 'School Commuters & Teens' },
  { value: 'general', label: 'General Healthy Household' },
];

export function HouseholdDbPanel({ onSelectQueryPrompt }: HouseholdDbPanelProps) {
  const {
    user,
    authBusy,
    authError,
    signInWithGoogle,
    signOutUser,
    dbProfiles,
    dbQueries,
    dbRoutines,
    dbLoading,
    dbError,
    saveDbProfile,
    activateDbProfile,
    deleteDbProfile,
    addDbRoutine,
    toggleDbRoutine,
    deleteDbRoutine,
  } = useAuth();

  const [tab, setTab] = useState<'profiles' | 'routines' | 'history'>('profiles');

  // New Profile Form
  const [profileName, setProfileName] = useState('');
  const [demographics, setDemographics] = useState('');
  const [sensitivityLevel, setSensitivityLevel] = useState('pediatric-elderly');
  const [safeTarget, setSafeTarget] = useState(25);
  const [notes, setNotes] = useState('');
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New Routine Form
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineCategory, setRoutineCategory] = useState('Filtration');
  const [routineCut, setRoutineCut] = useState(18);

  const activeDbProfile: DbHouseholdProfile | undefined = dbProfiles.find((p) => p.isActive);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !demographics.trim()) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await saveDbProfile({
        profileName: profileName.trim(),
        demographics: demographics.trim(),
        sensitivityLevel,
        safeIndoorPm25Target: safeTarget,
        notes: notes.trim(),
      });
      setProfileName('');
      setDemographics('');
      setNotes('');
      setFormMsg('Household profile saved and set active.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Unable to save household profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await addDbRoutine({
        title: routineTitle.trim(),
        category: routineCategory,
        pm25ReductionUg: routineCut,
      });
      setRoutineTitle('');
      setFormMsg('Custom low-emission routine added to your household plan.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Unable to add routine.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="section-vault"
      aria-label="Household Profiles, Routines & Query History"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto space-y-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 chapter-reveal">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-amber-400 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Personal Household Vault · Cloud Synced</span>
          </p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
            Save your family sensitivity profiles & routines.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Store custom household demographics, asthma or bronchitis thresholds, custom
            low-emission habits, and past atmospheric queries so every Gemini briefing reflects your
            exact home.
          </p>
        </div>

        {/* Google Auth Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-emerald-400/35 bg-slate-900">
              <div className="text-xs">
                <p className="font-semibold text-slate-100">
                  {user.displayName || 'Household Member'}
                </p>
                <p className="text-[11px] font-mono text-emerald-300">
                  {activeDbProfile ? `Active: ${activeDbProfile.profileName}` : 'Signed in'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOutUser()}
                disabled={authBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:border-rose-400/50 text-xs text-slate-300 hover:text-rose-300 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={authBusy}
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-semibold transition-colors shadow-[0_0_25px_rgba(245,158,11,0.28)] cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{authBusy ? 'Connecting…' : 'Sign In with Google to Sync'}</span>
            </button>
          )}
        </div>
      </div>

      {(authError || dbError || formMsg) && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-mono ${
            authError || dbError
              ? 'border-rose-400/35 bg-rose-500/10 text-rose-200'
              : 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {authError || dbError || formMsg}
        </div>
      )}

      {/* Workspace Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 overflow-hidden chapter-reveal">
        {/* Tabs Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'profiles'}
              onClick={() => setTab('profiles')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                tab === 'profiles'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Profiles ({dbProfiles.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'routines'}
              onClick={() => setTab('routines')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                tab === 'routines'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Custom Routines ({dbRoutines.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'history'}
              onClick={() => setTab('history')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                tab === 'history'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Query History ({dbQueries.length})</span>
            </button>
          </div>

          {dbLoading && (
            <span className="text-[11px] font-mono text-amber-300">Synchronizing…</span>
          )}
        </div>

        {!user ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Sign in with Google above to create personalized family sensitivity profiles (such as
              pediatric asthma or elderly chronic bronchitis targets), add custom home routines, and
              preserve your atmospheric query log across sessions.
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-7">
            {/* TAB 1: HOUSEHOLD PROFILES */}
            {tab === 'profiles' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleCreateProfile}
                  className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3.5"
                >
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-amber-300">
                    Create Household Profile
                  </p>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Profile Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Banjara Hills Family Home"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Family Demographics & Health Context
                    </label>
                    <input
                      type="text"
                      required
                      value={demographics}
                      onChange={(e) => setDemographics(e.target.value)}
                      placeholder="e.g. 5-yr-old child + grandmother with mild chronic bronchitis"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Sensitivity Tier
                      </label>
                      <select
                        value={sensitivityLevel}
                        onChange={(e) => setSensitivityLevel(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                      >
                        {SENSITIVITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Safe Indoor PM2.5 (µg/m³)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={60}
                        value={safeTarget}
                        onChange={(e) => setSafeTarget(Number(e.target.value) || 25)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Clinical / Room Safeguard Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Run bedroom HEPA overnight, keep inhaler handy"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{submitting ? 'Saving…' : 'Save & Activate Profile'}</span>
                  </button>
                </form>

                <div className="lg:col-span-7 space-y-3">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
                    Saved Household Profiles
                  </p>
                  {dbProfiles.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-400">
                      No custom profiles saved yet. Add one on the left to bind it directly to the
                      Gemini advisor and indoor air targets.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dbProfiles.map((prof) => (
                        <div
                          key={prof.id}
                          className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            prof.isActive
                              ? 'border-emerald-400/50 bg-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.12)]'
                              : 'border-slate-800 bg-slate-950/75'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-100">
                                {prof.profileName}
                              </span>
                              {prof.isActive && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-[10px] font-mono text-emerald-300">
                                  ACTIVE IN ADVISOR
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300">{prof.demographics}</p>
                            <p className="text-[11px] font-mono text-amber-300">
                              Tier: {prof.sensitivityLevel} · Target ≤ {prof.safeIndoorPm25Target} µg/m³
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {!prof.isActive && (
                              <button
                                type="button"
                                onClick={() => void activateDbProfile(prof.id)}
                                className="px-3 py-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/10 hover:bg-emerald-400/20 text-xs font-mono text-emerald-300 cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void deleteDbProfile(prof.id)}
                              aria-label={`Delete ${prof.profileName}`}
                              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM ROUTINES */}
            {tab === 'routines' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleCreateRoutine}
                  className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3.5"
                >
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-amber-300">
                    Add Low-Emission Routine
                  </p>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Routine Action</label>
                    <input
                      type="text"
                      required
                      value={routineTitle}
                      onChange={(e) => setRoutineTitle(e.target.value)}
                      placeholder="e.g. Run MERV-13 Corsi-Rosenthal box in study"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                      <select
                        value={routineCategory}
                        onChange={(e) => setRoutineCategory(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                      >
                        <option value="Filtration">Filtration</option>
                        <option value="Envelope">Envelope</option>
                        <option value="Source Control">Source Control</option>
                        <option value="Mobility">Mobility</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Est PM2.5 Cut (µg/m³)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={80}
                        value={routineCut}
                        onChange={(e) => setRoutineCut(Number(e.target.value) || 15)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Routine</span>
                  </button>
                </form>

                <div className="lg:col-span-7 space-y-2.5">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
                    Your Saved Routines (Live-Applied to Indoor Score)
                  </p>
                  {dbRoutines.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-400">
                      No custom routines added yet. Create routines tailored to your home layout.
                    </div>
                  ) : (
                    dbRoutines.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleDbRoutine(r.id, !r.enabled)}
                          className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <span
                            className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                              r.enabled
                                ? 'bg-emerald-400 border-emerald-400 text-slate-950'
                                : 'border-slate-700 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                              {r.title}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              {r.category} · −{r.pm25ReductionUg} µg/m³
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDbRoutine(r.id)}
                          aria-label={`Delete ${r.title}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: HISTORICAL SEARCH QUERIES */}
            {tab === 'history' && (
              <div className="space-y-3">
                <p className="text-xs font-mono uppercase tracking-[0.16em] text-slate-400">
                  Recent Atmospheric Inquiries
                </p>
                {dbQueries.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-400">
                    Ask a question in the Gemini Advisor below while signed in—your environmental
                    context and prompt will be archived here for one-tap replay.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {dbQueries.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                            <span>
                              {q.cityName} · AQI {q.aqi} · PM2.5 {q.pm25} µg/m³
                            </span>
                            <span className="text-slate-500">
                              {new Date(q.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-100 leading-snug">
                            “{q.queryText}”
                          </p>
                          {q.aiSummary && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {q.aiSummary}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectQueryPrompt(q.queryText);
                            document.getElementById('section-3')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="self-start px-3 py-1.5 rounded-lg border border-amber-400/35 bg-amber-400/10 hover:bg-amber-400/20 text-[11px] font-mono text-amber-300 cursor-pointer"
                        >
                          Re-run in Advisor
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
