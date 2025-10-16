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
const g = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}));
const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

/** החזר קונפיג מ־ENV, עם תיקונים/ברירות מחדל ידידותיות בזמן DEV */
function resolveFirebaseConfig() {
  const DEV_DEFAULTS = isDev ? {
    apiKey:        "AIzaSyA3boVq8BifcXzSYseulxJxgazyDXvExK0",
    authDomain:    "karina-web.firebaseapp.com",
    projectId:     "karina-web",
    // 👇 חשוב: הבקט הקיים אצלך בפועל
    storageBucket: "karina-web.firebasestorage.app",
    messagingSenderId: "294748432945",
    appId:         "1:294748432945:web:4f118fa9717536a2e9c310",
    measurementId: "G-W111YEYQ6K",
  } : {};

  const cfg = {
    apiKey:        process.env.REACT_APP_FB_API_KEY        || DEV_DEFAULTS.apiKey        || "",
    authDomain:    process.env.REACT_APP_FB_AUTH_DOMAIN    || DEV_DEFAULTS.authDomain    || "",
    projectId:     process.env.REACT_APP_FB_PROJECT_ID     || DEV_DEFAULTS.projectId     || "",
    storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET || DEV_DEFAULTS.storageBucket || "",
    messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID || DEV_DEFAULTS.messagingSenderId || "",
    appId:         process.env.REACT_APP_FB_APP_ID         || DEV_DEFAULTS.appId         || "",
    measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID || DEV_DEFAULTS.measurementId || undefined,
  };

  if (isDev) {
    console.log("[Firebase] config (redacted):", {
      ...cfg,
      apiKey: cfg.apiKey ? "<set>" : "<missing>",
      appId:  cfg.appId  ? "<set>" : "<missing>",
    });
    if (!cfg.projectId) console.warn("⚠️ Missing projectId. ודא קובץ .env תקין או אפשר DEV_DEFAULTS");
    if (cfg.storageBucket && !/\.(appspot|firebasestorage)\.app$/i.test(cfg.storageBucket)) {
      console.warn("⚠️ storageBucket לא נראה תקין. צפה ל: <project>.appspot.com או <project>.firebasestorage.app");
    }
  }
  return cfg;
}

const firebaseConfig = resolveFirebaseConfig();

/* =========================
   App (singleton)
   ========================= */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* =========================
   App Check (optional)
   ========================= */
export let appCheck = null;

const enableAppCheck = String(process.env.REACT_APP_ENABLE_APPCHECK || "false").toLowerCase() === "true";

if (isBrowser && enableAppCheck) {
  try {
    const envDebug = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
    if (envDebug && !(g && ("FIREBASE_APPCHECK_DEBUG_TOKEN" in g))) {
      g.FIREBASE_APPCHECK_DEBUG_TOKEN = envDebug;
      if (isDev) console.info("[AppCheck] Debug token from env set.");
    }

    const providerKind = (process.env.REACT_APP_APPCHECK_PROVIDER || "v3").toLowerCase();
    const v3Key  = process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY || "debug-key";
    const entKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "debug-key";

    const provider = providerKind === "enterprise"
      ? new ReCaptchaEnterpriseProvider(entKey)
      : new ReCaptchaV3Provider(v3Key);

    appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    if (isDev) console.log(`[AppCheck] initialized with provider: ${providerKind}`);

    if (isDev) {
      onAppCheckTokenChanged(appCheck, (tok) => {
        console.info("[AppCheck] token (dev):", tok?.token ? "(received)" : "(missing)");
      });
      getAppCheckToken(appCheck, true).catch((e) => {
        console.warn("[AppCheck] getToken failed (dev):", e?.message || e);
      });
    }
  } catch (e) {
    console.error("[AppCheck] init failed:", e?.message || e);
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
  } catch {}
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
   Storage + Functions
   ========================= */
const bucket = firebaseConfig.storageBucket?.trim();
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
if (isDev) {
  console.info("[Storage] using bucket:", bucket ? `gs://${bucket}` : "(default)");
}

const FUNCTIONS_REGION = process.env.REACT_APP_FB_FUNCTIONS_REGION || "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

/* =========================
   Online/Offline toggles + DEV helpers
   ========================= */
if (isBrowser) {
  window.addEventListener("online", () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }

  if (isDev) {
    try {
      window.auth = auth;
      window.db = db;
      window.functions = functions;
      window.storage = storage;
      window.appCheck = appCheck;
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
      console.warn("Debug window attach failed (ignored):", e?.message || e);
    }
  }
}

/* =========================
   Emulators (optional)
   ========================= */
const wantEmulators = String(process.env.REACT_APP_USE_EMULATORS || "false").toLowerCase() === "true";
const isLocalHost = isBrowser && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

if (wantEmulators && isLocalHost) {
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
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return await user.getIdToken(true);
}

// לחשיפה נוחה בקונסול
if (isBrowser && isDev) {
  try {
    window.ensureAuthTokenFresh = ensureAuthTokenFresh;
  } catch {}
}

// חשיפה של firebase/auth
if (isBrowser && isDev) {
  import("firebase/auth").then((mod) => {
    window.firebaseAuth = mod;
    console.info("[Firebase debug] window.firebaseAuth attached");
  });
}
