/**
 * Firebase client SDK – use in browser / client components only.
 * Server-side: use firebase-admin in API routes if needed.
 *
 * NOTE: This module is currently unused. App auth is NextAuth (Credentials) only.
 * Keep for optional future use (Firebase Auth, Firestore). For Firebase Hosting
 * deploy you only need firebase-tools; this file and the "firebase" npm package
 * are optional unless you add Firebase Auth/Firestore in the client.
 *
 * Set env vars in .env.local (see README):
 *   NEXT_PUBLIC_FIREBASE_API_KEY=
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
 *   NEXT_PUBLIC_FIREBASE_APP_ID=
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  const apps = getApps();
  if (apps.length > 0) return apps[0] as FirebaseApp;
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !firebaseConfig.appId
  ) {
    return null;
  }
  return initializeApp(firebaseConfig);
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

/** Use in client components. Returns null if Firebase is not configured. */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();
  if (!app) return null;
  cachedApp = app;
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/** Firebase app instance (client only). Null if env not set. */
export function getApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (cachedApp) return cachedApp;
  cachedApp = getFirebaseApp();
  return cachedApp;
}
