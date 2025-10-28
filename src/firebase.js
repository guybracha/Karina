/* global globalThis */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  doc, getDoc, setDoc,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  onTokenChanged as onAppCheckTokenChanged,
  getToken as getAppCheckToken,
} from "firebase/app-check";

/* =========================
   Environment helpers
   ========================= */
const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

function fromEnv(...keys) {
  const runtime = (isBrowser && window.__ENV__) || {};
  for (const raw of keys) {
    const v =
      process.env[raw] ||
      process.env[`REACT_APP_${raw}`] ||
      process.env[`VITE_${raw}`] ||
      runtime[raw] ||
      runtime[`REACT_APP_${raw}`] ||
      runtime[`VITE_${raw}`];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

/* =========================
   Firebase Config
   ========================= */
function resolveFirebaseConfig() {
  const cfg = {
    apiKey:            fromEnv("FB_API_KEY", "FIREBASE_API_KEY"),
    authDomain:        fromEnv("FB_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"),
    projectId:         fromEnv("FB_PROJECT_ID", "FIREBASE_PROJECT_ID"),
    storageBucket:     fromEnv("FB_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: fromEnv("FB_MESSAGING_SENDER_ID", "FIREBASE_MESSAGING_SENDER_ID"),
    appId:             fromEnv("FB_APP_ID", "FIREBASE_APP_ID"),
    measurementId:     fromEnv("FB_MEASUREMENT_ID", "FIREBASE_MEASUREMENT_ID") || undefined,
  };

  if (isDev) {
    console.log("[Firebase] config (redacted):", {
      ...cfg,
      apiKey: cfg.apiKey ? "<set>" : "<missing>",
      appId:  cfg.appId  ? "<set>" : "<missing>",
      measurementId: cfg.measurementId ? "<set>" : "<missing>",
    });
  }

  const must = ["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];
  const missing = must.filter(k => !cfg[k]);
  if (missing.length) throw new Error(`[Firebase config] missing: ${missing.join(", ")}`);

  return cfg;
}

const firebaseConfig = resolveFirebaseConfig();

/* =========================
   App (singleton)
   ========================= */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
if (process.env.NODE_ENV !== "production") {
  console.log("🔥 Firebase projectId:", app.options.projectId);
  globalThis.__FIREBASE_APP__ = app;
}

if (isBrowser) { try { window.firebaseApp = app; } catch {} }

/* =======================================================================
   App Check (reCAPTCHA Enterprise)
   NOTE: initialize BEFORE any Firestore/Functions/Storage usage.
   ======================================================================= */
const RECAPTCHA_ENTERPRISE_SITE_KEY =
  fromEnv("FB_RECAPTCHA_ENTERPRISE_KEY", "RECAPTCHA_ENTERPRISE_SITE_KEY") ||
  "6Le4t9crAAAAAGkwZ6OwapBndFGx7tJIATKrLIQ2";

// Better debug print (first 8 • last 6) to avoid confusing O/0
function maskKey(k) {
  if (!k) return "(missing)";
  const s = String(k);
  return s.slice(0, 8) + "…" + s.slice(-6);
}
if (typeof window !== "undefined") {
  console.info("[AppCheck] site key:", maskKey(RECAPTCHA_ENTERPRISE_SITE_KEY));
}

// Explicit on/off switch
const APPCHECK_ENABLE = (() => {
  const raw = fromEnv("APPCHECK_ENABLE");
  if (raw) {
    const enabled = /^1|true|yes$/i.test(raw);
    if (typeof window !== "undefined") {
      console.info("[AppCheck] APPCHECK_ENABLE from env:", raw, "->", enabled);
    }
    return enabled;
  }
  // Production fallback: enable if key exists
  if (!isDev && !!RECAPTCHA_ENTERPRISE_SITE_KEY) return true;
  return false;
})();
if (typeof window !== "undefined") {
  console.info("[AppCheck] APPCHECK_ENABLE effective:", APPCHECK_ENABLE);
}

const APPCHECK_DEBUG_TOKEN = fromEnv("APPCHECK_DEBUG_TOKEN"); // optional
if (isBrowser && APPCHECK_DEBUG_TOKEN) {
  // eslint-disable-next-line no-undef
  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN =
    APPCHECK_DEBUG_TOKEN === "true" ? true : APPCHECK_DEBUG_TOKEN;
}

// Small helper to await first App Check token (prevents early calls from failing)
async function waitForAppCheckToken(instance, { timeoutMs = 6000 } = {}) {
  if (!instance) return;
  let done;
  const p = new Promise((resolve) => (done = resolve));
  const unsub = onAppCheckTokenChanged(instance, (token) => {
    if (token) {
      try { unsub(); } catch {}
      done();
    }
  });
  // also kick an immediate fetch (non-force, to avoid rate limits)
  try { await getAppCheckToken(instance, false); } catch {}
  await Promise.race([
    p,
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

export const appCheck = (function initAppCheck() {
  if (!isBrowser) return null;
  if (!APPCHECK_ENABLE) {
    console.warn("[AppCheck] Disabled (APPCHECK_ENABLE not true).\nIf this is production, set APPCHECK_ENABLE=true and ensure reCAPTCHA Enterprise site key is valid.");
    return null;
  }
  if (!RECAPTCHA_ENTERPRISE_SITE_KEY) {
    console.warn("[AppCheck] Missing reCAPTCHA Enterprise site key – not initializing.");
    return null;
  }
  try {
    const inst = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.info("[AppCheck] initializeAppCheck success");
    onAppCheckTokenChanged(inst, (token) => {
      console.info("[AppCheck] token state:", token ? "OK" : "MISSING");
    });
    // Attempt an early token so first requests won't race
    getAppCheckToken(inst, false)
      .then(({ token }) => {
        console.info("[AppCheck] getToken success:", token ? token.slice(0, 12) + "…" : "(empty)");
      })
      .catch((err) => {
        // Common pitfall: recaptcha-error usually means wrong site key or domain not allowed
        console.error("[AppCheck] getToken failed:", err?.message || err);
      });

    // Expose a ready promise for app code that needs to wait
    if (isBrowser) {
      window.__appCheckReady = waitForAppCheckToken(inst, { timeoutMs: 6000 });
    }

    return inst;
  } catch (e) {
    console.warn("[AppCheck] init failed:", e?.message || e);
    return null;
  }
})();

/* =========================
   Auth (init after App Check)
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
   Analytics (optional)
   ========================= */
export let analytics = null;
if (isBrowser) {
  try {
    analyticsSupported()
      .then(ok => { if (ok) { try { analytics = getAnalytics(app); } catch {} } })
      .catch(() => {});
  } catch {}
}

/* =========================
   Firestore (cache + multi-tab)
   ========================= */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/* =========================
   Storage + Functions
   ========================= */
const bucket = (firebaseConfig.storageBucket || "").trim();
export const storage = bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
if (isDev) console.info("[Storage] using bucket:", bucket ? `gs://${bucket}` : "(default)");

const FUNCTIONS_REGION = fromEnv("FB_FUNCTIONS_REGION") || "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

/* =========================
   Online/Offline + DEV helpers
   ========================= */
if (isBrowser) {
  const goOnline = () => {
    enableNetwork(db).catch(() => {});
  };

  const goOffline = () => {
    disableNetwork(db).catch(() => {});
  };

  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    console.warn("[Firebase] navigator.onLine reported 'offline' at startup; deferring Firestore toggle until events fire.");
  }

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

      window.signInEmail = async (email, password) => {
        const res = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth] signInEmail:", res.user?.uid);
        return res.user;
      };
      window.signOut = async () => { await signOut(auth); console.log("[Auth] signed out"); };
    } catch (e) {
      console.warn("Debug window attach failed (ignored):", e?.message || e);
    }
  }
}

/* =========================
   Emulators (optional)
   ========================= */
const wantEmulators = (fromEnv("USE_EMULATORS") || "false").toLowerCase() === "true";
const isLocalHost =
  isBrowser && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

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
   Helpers
   ========================= */

export async function ensureAuthTokenFresh(force = true) {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return await user.getIdToken(!!force);
}

export async function getAppCheckTokenSafe(force = false) {
  try {
    if (!appCheck) return null;
    const { token } = await getAppCheckToken(appCheck, !!force);
    return token || null;
  } catch {
    return null;
  }
}

// Ensure AppCheck ready before sensitive calls (you can await this in critical flows)
export async function ensureAppCheckReady(timeoutMs = 6000) {
  try {
    // If __appCheckReady exists, await it; otherwise, no-op
    if (isBrowser && window.__appCheckReady instanceof Promise) {
      await Promise.race([
        window.__appCheckReady,
        new Promise((r) => setTimeout(r, timeoutMs)),
      ]);
    }
  } catch {}
}

const IMPERSONATE_FN_NAME = fromEnv("FN_IMPERSONATE") || "adminImpersonate";
export async function impersonateUser(uid) {
  await ensureAppCheckReady(); // soften race on first call
  const appCheckToken = await getAppCheckTokenSafe(); // may be null
  const call = httpsCallable(functions, IMPERSONATE_FN_NAME);
  const { data } = await call({ uid, appCheckToken });
  if (!data?.customToken) throw new Error("Impersonate failed: no customToken");
  const cred = await signInWithCustomToken(auth, data.customToken);
  return cred.user;
}

// expose helpers to window (dev / debug)
if (typeof window !== "undefined") {
  try {
    window.getAppCheckTokenSafe = getAppCheckTokenSafe;
    window.ensureAppCheckReady = ensureAppCheckReady;
    window.ensureAuthTokenFresh = ensureAuthTokenFresh;
    window.firebaseApp = app;
    window.firebaseAuth = auth;
    window.firebaseDb = db;
    window.firebaseFunctions = functions;
    window.firebaseStorage = storage;
    window.appCheckInstance = appCheck; // null when disabled
    console.info("[Firebase] debug helpers attached to window");
  } catch (e) {
    console.warn("[Firebase] expose helpers failed:", e);
  }
}

export default app;
