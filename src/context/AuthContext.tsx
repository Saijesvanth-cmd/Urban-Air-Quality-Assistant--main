import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

export interface DbHouseholdProfile {
  id: number;
  userUid: string;
  profileName: string;
  demographics: string;
  sensitivityLevel: string;
  safeIndoorPm25Target: number;
  notes: string;
  isActive: boolean;
  updatedAt: string;
}

export interface DbSearchQuery {
  id: number;
  userUid: string;
  cityId: string;
  cityName: string;
  aqi: number;
  pm25: number;
  windKmh: number;
  queryText: string;
  aiSummary: string;
  createdAt: string;
}

export interface DbCustomRoutine {
  id: number;
  userUid: string;
  title: string;
  category: string;
  pm25ReductionUg: number;
  enabled: boolean;
  createdAt: string;
}

export interface FirestoreObservation {
  id: string;
  uid: string;
  placeName: string;
  kind: 'green_zone' | 'sensor_station' | 'neighborhood';
  cityName: string;
  aqi: number;
  pm25: number;
  notes?: string;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;

  // PostgreSQL Workspace state
  dbProfiles: DbHouseholdProfile[];
  dbQueries: DbSearchQuery[];
  dbRoutines: DbCustomRoutine[];
  dbLoading: boolean;
  dbError: string | null;
  refreshWorkspace: () => Promise<void>;
  saveDbProfile: (input: {
    profileName: string;
    demographics: string;
    sensitivityLevel: string;
    safeIndoorPm25Target: number;
    notes?: string;
  }) => Promise<void>;
  activateDbProfile: (id: number) => Promise<void>;
  deleteDbProfile: (id: number) => Promise<void>;
  recordDbQuery: (input: {
    cityId: string;
    cityName: string;
    aqi: number;
    pm25: number;
    windKmh: number;
    queryText: string;
    aiSummary?: string;
  }) => Promise<void>;
  addDbRoutine: (input: {
    title: string;
    category: string;
    pm25ReductionUg: number;
  }) => Promise<void>;
  toggleDbRoutine: (id: number, enabled: boolean) => Promise<void>;
  deleteDbRoutine: (id: number) => Promise<void>;

  // Firestore Saved Observations
  observations: FirestoreObservation[];
  saveObservationToFirestore: (input: {
    placeName: string;
    kind: 'green_zone' | 'sensor_station' | 'neighborhood';
    cityName: string;
    aqi: number;
    pm25: number;
    notes?: string;
  }) => Promise<void>;
  deleteObservationFromFirestore: (id: string) => Promise<void>;
  updatePreferredCityInFirestore: (cityId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return cleaned || 'hyderabad';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [dbProfiles, setDbProfiles] = useState<DbHouseholdProfile[]>([]);
  const [dbQueries, setDbQueries] = useState<DbSearchQuery[]>([]);
  const [dbRoutines, setDbRoutines] = useState<DbCustomRoutine[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const [observations, setObservations] = useState<FirestoreObservation[]>([]);

  const getAuthToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setDbProfiles([]);
      setDbQueries([]);
      setDbRoutines([]);
      return;
    }

    setDbLoading(true);
    setDbError(null);
    try {
      const token = await current.getIdToken();
      const resp = await fetch('/api/user/workspace', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to sync PostgreSQL workspace.');
      }
      setDbProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      setDbQueries(Array.isArray(data.queries) ? data.queries : []);
      setDbRoutines(Array.isArray(data.routines) ? data.routines : []);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Unable to reach PostgreSQL backend.');
    } finally {
      setDbLoading(false);
    }
  }, []);

  // Auth listener + Firestore user profile sync + observations subscription
  useEffect(() => {
    let unsubObservations: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (unsubObservations) {
        unsubObservations();
        unsubObservations = null;
      }

      if (!nextUser) {
        setDbProfiles([]);
        setDbQueries([]);
        setDbRoutines([]);
        setObservations([]);
        return;
      }

      // Sync PostgreSQL workspace
      void refreshWorkspace();

      // Sync Firestore profile document safely
      const userPath = `users/${nextUser.uid}`;
      try {
        const userRef = doc(db, 'users', nextUser.uid);
        const snap = await getDoc(userRef);
        const existingCity =
          snap.exists() && typeof snap.data()?.preferredCityId === 'string'
            ? sanitizeId(snap.data().preferredCityId)
            : 'hyderabad';
        await setDoc(userRef, {
          uid: nextUser.uid,
          displayName: (nextUser.displayName || 'Atmosphere Member').slice(0, 100),
          preferredCityId: existingCity,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, userPath);
        } catch {
          // Logged cleanly by handleFirestoreError without crashing root
        }
      }

      // Subscribe to owner-scoped Firestore observations
      const obsPath = `users/${nextUser.uid}/observations`;
      const obsQuery = query(
        collection(db, 'users', nextUser.uid, 'observations'),
        where('uid', '==', nextUser.uid),
        orderBy('createdAt', 'desc')
      );

      unsubObservations = onSnapshot(
        obsQuery,
        (snapshot) => {
          const items: FirestoreObservation[] = snapshot.docs.map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              uid: String(raw.uid ?? nextUser.uid),
              placeName: String(raw.placeName ?? ''),
              kind: (raw.kind as FirestoreObservation['kind']) || 'green_zone',
              cityName: String(raw.cityName ?? ''),
              aqi: Number(raw.aqi ?? 0),
              pm25: Number(raw.pm25 ?? 0),
              notes: typeof raw.notes === 'string' ? raw.notes : undefined,
            };
          });
          setObservations(items);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, obsPath);
          } catch {
            // Logged structured context
          }
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubObservations) unsubObservations();
    };
  }, [refreshWorkspace]);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In did not complete.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const saveDbProfile = useCallback(
    async (input: {
      profileName: string;
      demographics: string;
      sensitivityLevel: string;
      safeIndoorPm25Target: number;
      notes?: string;
    }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in with Google to save profiles to PostgreSQL.');
      const resp = await fetch('/api/user/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to save household profile.');
      await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const activateDbProfile = useCallback(
    async (id: number) => {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/user/profiles/${id}/activate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const deleteDbProfile = useCallback(
    async (id: number) => {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/user/profiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const recordDbQuery = useCallback(
    async (input: {
      cityId: string;
      cityName: string;
      aqi: number;
      pm25: number;
      windKmh: number;
      queryText: string;
      aiSummary?: string;
    }) => {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch('/api/user/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (resp.ok) await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const addDbRoutine = useCallback(
    async (input: { title: string; category: string; pm25ReductionUg: number }) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Sign in with Google to save custom routines.');
      const resp = await fetch('/api/user/routines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to add custom routine.');
      await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const toggleDbRoutine = useCallback(
    async (id: number, enabled: boolean) => {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/user/routines/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      if (resp.ok) await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const deleteDbRoutine = useCallback(
    async (id: number) => {
      const token = await getAuthToken();
      if (!token) return;
      const resp = await fetch(`/api/user/routines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) await refreshWorkspace();
    },
    [getAuthToken, refreshWorkspace]
  );

  const saveObservationToFirestore = useCallback(
    async (input: {
      placeName: string;
      kind: 'green_zone' | 'sensor_station' | 'neighborhood';
      cityName: string;
      aqi: number;
      pm25: number;
      notes?: string;
    }) => {
      const current = auth.currentUser;
      if (!current) {
        throw new Error('Sign in with Google to save pins to Firestore.');
      }
      const obsId = `obs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const obsPath = `users/${current.uid}/observations/${obsId}`;
      try {
        await setDoc(doc(db, 'users', current.uid, 'observations', obsId), {
          uid: current.uid,
          placeName: input.placeName.trim().slice(0, 140),
          kind: input.kind,
          cityName: input.cityName.trim().slice(0, 80),
          aqi: Math.max(0, Math.min(2000, Math.round(input.aqi))),
          pm25: Math.max(0, Math.min(2000, Math.round(input.pm25))),
          notes: (input.notes ?? '').trim().slice(0, 280),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, obsPath);
      }
    },
    []
  );

  const deleteObservationFromFirestore = useCallback(async (id: string) => {
    const current = auth.currentUser;
    if (!current) return;
    const safeId = sanitizeId(id);
    const obsPath = `users/${current.uid}/observations/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', current.uid, 'observations', safeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, obsPath);
    }
  }, []);

  const updatePreferredCityInFirestore = useCallback(async (cityId: string) => {
    const current = auth.currentUser;
    if (!current) return;
    const userPath = `users/${current.uid}`;
    try {
      await setDoc(doc(db, 'users', current.uid), {
        uid: current.uid,
        displayName: (current.displayName || 'Atmosphere Member').slice(0, 100),
        preferredCityId: sanitizeId(cityId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        authBusy,
        authError,
        signInWithGoogle,
        signOutUser,
        getAuthToken,
        dbProfiles,
        dbQueries,
        dbRoutines,
        dbLoading,
        dbError,
        refreshWorkspace,
        saveDbProfile,
        activateDbProfile,
        deleteDbProfile,
        recordDbQuery,
        addDbRoutine,
        toggleDbRoutine,
        deleteDbRoutine,
        observations,
        saveObservationToFirestore,
        deleteObservationFromFirestore,
        updatePreferredCityInFirestore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
