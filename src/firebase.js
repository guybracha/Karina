// src/firebase.js
/* global globalThis */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import {
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
  // debug helpers
  doc, getDoc, setDoc,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  onTokenChanged as onAppCheckTokenChanged,
  getToken as getAppCheckToken,
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

const g = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}));
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
   App Check – DEV (debug) + PROD
   ========================= */
let appCheck = null; // optional export if you need it elsewhere

if (isBrowser) {
  // הפעלת Debug Token ל־localhost או לפי env — חשוב לעשות לפני initializeAppCheck
  try {
    const host = window?.location?.hostname || "";
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(host);
    const envDebug = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
    if (isLocalhost || envDebug) {
      // true יוצר טוקן אוטומטי בקונסולה; או אפשר להציב מחרוזת קבועה מה־env
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = envDebug || true;
      console.info("[AppCheck] Debug token enabled (localhost/env).");
    }
  } catch {
    // ignore
  }

  const providerKind = (process.env.REACT_APP_APPCHECK_PROVIDER || (isDev ? "v3" : "v3")).toLowerCase();
  const v3Key = process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY || "debug-key";
  const entKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "debug-key";

  const provider = providerKind === "enterprise"
    ? new ReCaptchaEnterpriseProvider(entKey)
    : new ReCaptchaV3Provider(v3Key);

  try {
    appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    console.log(`[AppCheck] initialized with provider: ${providerKind}`);

    if (isDev) {
      // לוגים דבאג לטוקן — יעזור לזהות למה preflight נכשל
      onAppCheckTokenChanged(appCheck, (tok) => {
        if (!tok) {
          console.warn("[AppCheck] token missing (dev)");
        } else {
          console.info("[AppCheck] token (dev):", tok.token ? "(received)" : "(empty)");
        }
      });
      // בקשה יזומה לטוקן כדי להדליק early failures
      getAppCheckToken(appCheck, /* forceRefresh */ true).catch((e) => {
        console.warn("[AppCheck] getToken failed (dev):", e?.message || e);
      });
    }
  } catch (e) {
    console.error("[AppCheck] initializeAppCheck failed:", e?.message || e);
  }
}

/* =========================
   Analytics (optional)
   ========================= */
export let analytics = null;
if (isBrowser) {
  try {
    analyticsSupported().then((ok) => {
      if (ok) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn("[Analytics] init failed (ignored):", e?.message || e);
        }
      }
    }).catch(() => {});
  } catch {
    // ignore
  }
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
   Auth – popup resolver + local persistence
   ========================= */
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
const bucket = firebaseConfig.storageBucket;
// אם הוגדר bucket, נרצה לעגן אליו את ה-Storage (ה־SDK כבר יצרף App Check/ID token מאחורי הקלעים)
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);

const FUNCTIONS_REGION = "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

/* =========================
   Online/Offline toggles
   ========================= */
if (isBrowser) {
  window.addEventListener("online", () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }

  /* ===== DEV debug helpers on window ===== */
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
        await auth.currentUser?.getIdToken(true);
        return window.fsUserGet();
      };

      console.info("[Firebase debug] window.auth/db/functions/storage + fs* helpers attached");
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
  await u.getIdToken(true); // רענון ID token; App Check token מתרענן אוטומטית
  return u;
}

// (אופציונלי) לייצא את appCheck אם תרצה להשתמש בו ישירות:
export { appCheck };
