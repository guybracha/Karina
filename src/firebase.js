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
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

const isBrowser = typeof window !== "undefined";

if (process.env.NODE_ENV !== "production") {
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
  // DEVELOPMENT: רשום את אותו UUID בדיוק במסך App Check → Apps → ⋮ → Manage debug tokens
  if (process.env.NODE_ENV !== "production") {
    // שים כאן את ה-UUID שמופיע לך בקונסול (כבר אישרת אותו במסך הדיבאג)
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = "e930a924-562e-4354-b714-711983e994ac";
  }

  const enterpriseKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
  if (!enterpriseKey && process.env.NODE_ENV !== "production") {
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
export const storage = getStorage(app, "gs://karina-web.firebasestorage.app");
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
const wantEmulators = String(process.env.REACT_APP_USE_EMULATORS).toLowerCase() === "true";
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
