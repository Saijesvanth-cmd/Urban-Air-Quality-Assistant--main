import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

if (!getApps().length) {
  
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    let serviceAccount: Record<string, unknown>;
    try {
      serviceAccount = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.');
    }
    if (
      typeof serviceAccount.project_id === 'string' &&
      serviceAccount.project_id !== firebaseConfig.projectId
    ) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT belongs to a different Firebase project.');
    }
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      projectId: firebaseConfig.projectId,
    });
  } else {
    // ADC is available in Google Cloud. On Vercel, configure FIREBASE_SERVICE_ACCOUNT.
    initializeApp({ projectId: firebaseConfig.projectId });
  }
}

export const adminAuth = getAuth();
