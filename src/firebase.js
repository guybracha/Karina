/* global globalThis */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  onAuthStateChanged,
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
const g = (typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : {}));
const isBrowser = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

function fromEnv(...keys) {
  const runtime = (isBrowser && window.__ENV__) || {};
  for (const raw of keys) {
    // מאפשר גם REACT_APP_* וגם VITE_* וגם מפתח runtime
    const v =
      process.env[raw] ||
      process.env[`REACT_APP_${raw}`] ||
      process.env[`VITE_${raw}`] ||
      runtime[raw] ||
      runtime[`REACT_APP_${raw}`] ||
      runtime[`VITE_${raw}`];
    if (v) return String(v).trim();
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
if (isBrowser) { try { window.firebaseApp = app; } catch {} }

/* =======================================================================
   App Check — reCAPTCHA Enterprise ONLY (ללא v3, כדי למנוע התנגשויות)
   ======================================================================= */
export let appCheck = null;
const ENABLE_APPCHECK = (fromEnv("ENABLE_APPCHECK") || "true").toLowerCase() === "true";

// השם האחיד ל־site key של reCAPTCHA Enterprise
const ENTERPRISE_SITE_KEY =
  fromEnv("RECAPTCHA_ENTERPRISE_SITE_KEY", "APPCHECK_E_SITE_KEY", "RECAPTCHA_SITE_KEY");

// Debug token לפיתוח (localhost) – קבוע שהצגת לי: 61BA4D5C-65FC-433B-83F7-78D9890F5D24
const ENV_DEBUG_TOKEN = fromEnv("APPCHECK_DEBUG_TOKEN");
if (isBrowser) {
  const host = g?.location?.hostname || "";
  if (host === "localhost" || host === "127.0.0.1") {
    // אם נתת טוקן – נשתמש בו; אחרת אפשר true ליצירה אוטומטית
    g.FIREBASE_APPCHECK_DEBUG_TOKEN = ENV_DEBUG_TOKEN || "61BA4D5C-65FC-433B-83F7-78D9890F5D24";
  }
}

async function getAppCheckAttestation(forceRefresh = false) {
  try {
    if (!appCheck) return null;
    const tok = await getAppCheckToken(appCheck, forceRefresh);
    return tok?.token || null;
  } catch { return null; }
}

if (isBrowser && ENABLE_APPCHECK) {
  try {
    if (!ENTERPRISE_SITE_KEY) {
      console.warn("[AppCheck] Missing RECAPTCHA_ENTERPRISE_SITE_KEY – skipping init.");
    } else {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(ENTERPRISE_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });

      try {
        window.appCheck = appCheck;
        window.getAppCheckToken = () => getAppCheckToken(appCheck, true);
      } catch {}

      onAppCheckTokenChanged(appCheck, (tok) => {
        if (isDev) console.log("[AppCheck] token state:", tok ? "OK" : "MISSING");
      });

      // טריגר ראשוני כדי לוודא שהטוקן מונפק לפני פעולות Auth/OAuth
      getAppCheckToken(appCheck, true).catch(e =>
        console.warn("[AppCheck] getToken failed:", e?.message || e)
      );
    }
  } catch (e) {
    console.error("[AppCheck] init failed:", e?.message || e);
  }
}

/* =========================
   Auth (אחרי App Check)
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
  window.addEventListener("online",  () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  if (!navigator.onLine) { disableNetwork(db).catch(() => {}); }

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
   Helpers
   ========================= */
export async function ensureAuthTokenFresh() {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  return await user.getIdToken(true);
}

// App Check token (אם מאותחל)
async function getAppCheckTokenSafe() { return await getAppCheckAttestation(false); }

// התחזות כ-UID (Cloud Function adminImpersonate)
const IMPERSONATE_FN_NAME = fromEnv("FN_IMPERSONATE") || "adminImpersonate";
export async function impersonateUser(uid) {
  const appCheckToken = await getAppCheckTokenSafe(); // יכול להיות null; הפונקציה בענן צריכה לדעת לקבל null
  const call = httpsCallable(functions, IMPERSONATE_FN_NAME);
  const { data } = await call({ uid, appCheckToken });
  if (!data?.customToken) throw new Error("Impersonate failed: no customToken");
  const cred = await signInWithCustomToken(auth, data.customToken);
  return cred.user;
}

// QA לוג ב־DEV
if (isBrowser && isDev) {
  onAuthStateChanged(auth, (u) => {
    console.info("[Auth] state:", u ? { uid: u.uid, email: u.email } : "(signed out)");
  });
}
