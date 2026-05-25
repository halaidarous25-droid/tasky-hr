import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.startsWith('your-')
);

function initApp() {
  if (!isFirebaseConfigured) return null;
  try {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('Firebase init failed:', e);
    return null;
  }
}

export const app = initApp();
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const FIREBASE_CONFIG = firebaseConfig;
