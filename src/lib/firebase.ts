import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
const storageBucket = (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim();

// SELF-HEALING: Older projects use .appspot.com, newer ones use .firebasestorage.app 🧭
// Most default buckets are actually .appspot.com! Changing default to be safe.
const finalBucket = storageBucket || (projectId ? `${projectId}.appspot.com` : "");

const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: projectId,
  storageBucket: finalBucket,
  messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim(),
  databaseURL: (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").trim(),
};

// Safe build-time check to prevent prerendering failure when environment variables are missing
const isMissingKeys = !firebaseConfig.apiKey;
const finalConfig = isMissingKeys && typeof window === "undefined"
  ? {
      apiKey: "dummy-api-key-for-build",
      authDomain: `${projectId || "dummy"}.firebaseapp.com`,
      projectId: projectId || "dummy",
      storageBucket: finalBucket || `${projectId || "dummy"}.appspot.com`,
      messagingSenderId: "123456789",
      appId: "1:123456789:web:123456",
      databaseURL: `https://${projectId || "dummy"}.firebaseio.com`,
    }
  : firebaseConfig;

const app = getApps().length > 0 ? getApp() : initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Lazy Exports to prevent initialization race conditions! 🏎️💨
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// LEGACY FALLBACK STORAGE 🧭
export const legacyStorage = getStorage(app, `gs://${projectId}.appspot.com`);

export const getRtdb = () => rtdb; 

export { app };
