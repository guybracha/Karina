// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// ----------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET, // ← קרא מהסביבה
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
  console.log("Firebase config:", firebaseConfig);
  if (!firebaseConfig.projectId) {
    console.warn("⚠️ Missing REACT_APP_FB_PROJECT_ID (בדקו .env).");
  }
}

// -------- App (singleton)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ===== App Check (reCAPTCHA Enterprise) =====
// חייב לרוץ *לפני* יצירת Auth/Firestore/Storage/Functions
if (isBrowser) {
  // DEV: ניהול Debug Token דרך .env
  // REACT_APP_APPCHECK_DEBUG_TOKEN=<uuid>  → השתמש בטוקן שאישרת בקונסול
  // REACT_APP_APPCHECK_DEBUG_TOKEN=auto    → הפק טוקן חדש והדפס אותו לקונסול
  if (isDev) {
    const raw = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
    if (raw === "auto") {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // יפיק וידפיס לקונסול
      console.info("AppCheck: debug token = auto (see console for generated token)");
    } else if (raw && raw.trim()) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = raw.trim();
      console.info("AppCheck: using debug token from .env");
    } else {
      console.info("AppCheck: no debug token provided");
    }
  }

  const enterpriseKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
  if (!enterpriseKey && isDev) {
    console.warn("⚠️ Missing REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY (App Check).");
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(enterpriseKey || "missing-site-key"),
    isTokenAutoRefreshEnabled: true,
  });
}

// ===== Analytics (רק אם נתמך)
export let analytics = null;
if (isBrowser) {
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

// ===== Firestore (Cache מתמשך וריבוי טאבס)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// ===== Services נוספים
export const auth = getAuth(app);

// בחר את הבאקט מ־config (ברירת מחדל: מה־project)
// אם יש storageBucket בקונפיג – נשתמש בו; אחרת getStorage(app) לבאקט ברירת מחדל.
const bucket = firebaseConfig.storageBucket;
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);

const FUNCTIONS_REGION = "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

// ===== ניהול רשת (online/offline) ל-Firestore
if (isBrowser) {
  window.addEventListener("online", () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }
}

// ===== אמולטורים (אופציונלי)
const wantEmulators = String(process.env.REACT_APP_USE_EMULATORS || "false").toLowerCase() === "true";
if (wantEmulators) {
  try {
    console.log("🔌 Using Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (e) {
    console.warn("Emulator connection failed (ignored):", e?.message || e);
  }
}

// ===== Helper: ודא התחברות + רענון טוקן לפני העלאה ל-Storage
export async function ensureAuthTokenFresh() {
  const u = auth.currentUser;
  if (!u) throw new Error("not_authed");
  await u.getIdToken(true);
  return u;
}
