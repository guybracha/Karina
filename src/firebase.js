// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import {
  // אתחול Auth עם resolver לפופ־אפ + התמדה בדפדפן
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  // helpers for console debugging
  doc, getDoc, setDoc,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
} from "firebase/app-check";

/* =========================
   Config & Environment
   ========================= */
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
const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
  console.log("[Firebase] config:", {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? "<set>" : "<missing>",
    appId: firebaseConfig.appId ? "<set>" : "<missing>",
  });
  if (!firebaseConfig.projectId) {
    console.warn("⚠️ Missing REACT_APP_FB_PROJECT_ID (.env).");
  }
}

/* =========================
   App (singleton)
   ========================= */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* =========================
   App Check – run only in PRODUCTION
   ========================= */
if (isBrowser && !isDev) {
  const providerKind = (process.env.REACT_APP_APPCHECK_PROVIDER || "enterprise").toLowerCase();
  let provider;
  if (providerKind === "v3") {
    const siteKey = process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY || "";
    provider = new ReCaptchaV3Provider(siteKey);
    console.log("[AppCheck] Provider: reCAPTCHA v3");
  } else {
    const siteKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
    provider = new ReCaptchaEnterpriseProvider(siteKey);
    console.log("[AppCheck] Provider: reCAPTCHA Enterprise");
  }
  try {
    initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
  } catch (e) {
    console.error("[AppCheck] initializeAppCheck failed:", e?.message || e);
  }
} else if (isBrowser) {
  console.info("[AppCheck] Skipped (DEV mode)");
}

/* =========================
   Analytics (optional)
   ========================= */
export let analytics = null;
if (isBrowser) {
  analyticsSupported().then((ok) => {
    if (ok) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("[Analytics] init failed (ignored):", e?.message || e);
      }
    }
  });
}

/* =========================
   Firestore (persistent cache + multi-tab)
   ========================= */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/* =========================
   Auth – יציב לפופ־אפ + עבודה עם redirect
   ========================= */
// ננסה לאתחל את Auth עם popupRedirectResolver. אם כבר אותחל (Hot Reload), נשתמש ב-getAuth.
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
})();

/* =========================
   Services
   ========================= */
// Storage: respect explicit bucket when provided
const bucket = firebaseConfig.storageBucket;
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);

const FUNCTIONS_REGION = "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

/* =========================
   Online/Offline network toggles for Firestore
   ========================= */
if (isBrowser) {
  window.addEventListener("online", () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }

  /* =========================
     🔍 Debug helpers (DEV only)
     expose to window for quick console checks:
     - auth / db / functions / storage
     - await fsGet(`users/${auth.currentUser?.uid}`)
     - await fsSet(`users/${auth.currentUser?.uid}`, { approved: true }, true)
     - await fsUserGet()
     - await fsUserApprove({ role: 'customer' })
     ========================= */
  if (isDev) {
    try {
      window.auth = auth;
      window.db = db;
      window.functions = functions;
      window.storage = storage;

      window.fsGet = async (path) => {
        const snap = await getDoc(doc(db, path));
        console.log("[fsGet]", path, "exists:", snap.exists(), "data:", snap.data());
        return snap;
      };

      window.fsSet = async (path, data, merge = true) => {
        await setDoc(doc(db, path), data, { merge });
        console.log("[fsSet] wrote", path, data, "(merge:", merge, ")");
      };

      window.fsUserGet = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return console.warn("fsUserGet: no current user");
        return window.fsGet(`users/${uid}`);
      };

      window.fsUserApprove = async (extra = {}) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return console.warn("fsUserApprove: no current user");
        await window.fsSet(`users/${uid}`, { approved: true, ...extra }, true);
        await auth.currentUser?.getIdToken(true); // refresh token after change
        return window.fsUserGet();
      };

      console.info("[Firebase debug] window.auth/db/functions/storage + fsGet/fsSet/fsUserGet/fsUserApprove available");
    } catch (e) {
      console.warn("Debug window attach failed:", e);
    }
  }
}

/* =========================
   Emulators (optional)
   ========================= */
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

/* =========================
   Helper: ensureAuthTokenFresh
   ========================= */
export async function ensureAuthTokenFresh() {
  const u = auth.currentUser;
  if (!u) throw new Error("not_authed");
  await u.getIdToken(true);
  return u;
}
