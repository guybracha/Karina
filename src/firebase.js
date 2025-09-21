// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// ---------------------------
// טעינת קונפיג מה-ENV (ברירת מחדל)
// ---------------------------
let firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

// ---------------------------
// Fallback בזמן ריצה: אם חסר apiKey/projectId נטען public/firebase.config.json
// ---------------------------
async function ensureRuntimeConfig() {
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
    try {
      const res = await fetch("/firebase.config.json", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        firebaseConfig = { ...firebaseConfig, ...json };
      }
    } catch {
      // מתעלמים – אם עדיין חסר, נראה לוג בהמשך
    }
  }
}

const isBrowser = typeof window !== "undefined";
if (isBrowser) {
  // אם סביבת הבילד שלך לא תומכת top-level await, הזז לפונקציית bootstrap לפני render של האפליקציה.
  await ensureRuntimeConfig();
}

// DEBUG (בפיתוח בלבד)
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("Firebase config:", firebaseConfig);
  if (!firebaseConfig.projectId) {
    // eslint-disable-next-line no-console
    console.error("❌ Missing REACT_APP_FB_PROJECT_ID (ENV לא נטענו?).");
  }
}

// אתחול אפליקציה (להימנע מאתחול כפול)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// אנליטיקס – רק אם נתמך ובדפדפן
export let analytics = null;
if (isBrowser) {
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

// שירותים
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ STORAGE
// אם הגדרת storageBucket ב-config (מומלץ), getStorage ישתמש בו אוטומטית.
export const storage = getStorage(app);

// ✅ FUNCTIONS – אזור ברירת מחדל (התאם לפי הפריסה שלך)
const FUNCTIONS_REGION = "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

// ---------------------------
// Emulators – פיתוח מקומי ללא עלות
// הפעלה אוטומטית אם:
// 1) רץ ב-localhost, או
// 2) מוגדר REACT_APP_USE_EMULATORS=true
// ---------------------------
const wantEmulators =
  (isBrowser && window.location.hostname === "localhost") ||
  String(process.env.REACT_APP_USE_EMULATORS).toLowerCase() === "true";

if (wantEmulators) {
  try {
    // eslint-disable-next-line no-console
    console.log("🔌 Using Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199); // 👈 STORAGE EMULATOR
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Emulator connection failed (ignored):", e?.message || e);
  }
}
