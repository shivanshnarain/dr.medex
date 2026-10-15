import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

/**
 * Firebase Client SDK Configuration for DR.MEDEX Global
 * Exclusively configured for Firestore product reviews & customer feedback.
 * Server secrets, Admin SDK keys, and Gemini keys are NEVER exposed here.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "drmedex.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "drmedex",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "drmedex.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "874229763738",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S976CKT5YJ"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  if (firebaseConfig.apiKey) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  }
} catch (err) {
  console.warn("[Firebase] Client SDK initialization notice:", err);
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export default appInstance;
